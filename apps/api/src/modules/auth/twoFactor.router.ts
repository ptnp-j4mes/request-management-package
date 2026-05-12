import { Elysia, t } from "elysia";
import { jwtVerify, SignJWT } from "jose";
import { db } from "../../lib/db";
import { users, otpTokens } from "@rm/db";
import { eq, and, isNull, gt } from "drizzle-orm";
import { ok, err } from "../../lib/response";
import { authenticate, getUserWithRoles } from "../../lib/auth";
import { sendOtpEmail } from "../../lib/email";

const JWT_2FA_KEY = new TextEncoder().encode(process.env.JWT_2FA_SECRET ?? "changeme-2fa-secret");
const JWT_SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET ?? "changeme-set-in-env");
const JWT_REFRESH_KEY = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET ?? "changeme-refresh-set-in-env"
);

async function generateAndSendOtp(
  userId: number,
  email: string,
  purpose: "login" | "enable_2fa" | "disable_2fa"
): Promise<void> {
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db
    .update(otpTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(otpTokens.userId, userId), eq(otpTokens.purpose, purpose), isNull(otpTokens.usedAt)));

  await db.insert(otpTokens).values({ userId, code, purpose, expiresAt });
  await sendOtpEmail(email, code);
}

async function verifyOtp(userId: number, code: string, purpose: string): Promise<boolean> {
  const now = new Date();
  const [token] = await db
    .select()
    .from(otpTokens)
    .where(
      and(
        eq(otpTokens.userId, userId),
        eq(otpTokens.code, code),
        eq(otpTokens.purpose, purpose),
        isNull(otpTokens.usedAt),
        gt(otpTokens.expiresAt, now)
      )
    )
    .limit(1);

  if (!token) return false;
  await db.update(otpTokens).set({ usedAt: now }).where(eq(otpTokens.id, token.id));
  return true;
}

async function verifyPendingToken(token: string): Promise<{ sub: number; type: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_2FA_KEY);
    return { sub: Number(payload.sub), type: payload.type as string };
  } catch {
    return null;
  }
}

async function signFullTokens(userId: number) {
  const fullUser = await getUserWithRoles(userId);
  if (!fullUser) return null;

  const now = Math.floor(Date.now() / 1000);

  const accessToken = await new SignJWT({
    sub: String(userId),
    email: fullUser.email ?? "",
    departmentId: fullUser.departmentId ?? null,
    roles: fullUser.roles,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + 15 * 60)
    .sign(JWT_SECRET_KEY);

  const refreshToken = await new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + 7 * 24 * 60 * 60)
    .sign(JWT_REFRESH_KEY);

  return {
    accessToken,
    refreshToken,
    user: {
      id: fullUser.id,
      name: fullUser.fullName,
      email: fullUser.email ?? "",
      departmentId: fullUser.departmentId ?? null,
      roles: fullUser.roles,
    },
  };
}

export const twoFactorRouter = new Elysia({ prefix: "/auth/2fa" })
  .use(authenticate)

  // GET /auth/2fa/status
  .get("/status", async ({ user }: any) => {
    const [row] = await db
      .select({ twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, user.id));
    return ok({ enabled: row?.twoFactorEnabled ?? false });
  })

  // POST /auth/2fa/enable — send OTP to start enable flow
  .post("/enable", async ({ user, set }: any) => {
    const [row] = await db
      .select({ email: users.email, twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, user.id));
    if (!row?.email) {
      set.status = 400;
      return err("No email address on account");
    }
    if (row.twoFactorEnabled) {
      set.status = 400;
      return err("2FA is already enabled");
    }
    await generateAndSendOtp(user.id, row.email, "enable_2fa");
    return ok({ message: "OTP sent to your email" });
  })

  // POST /auth/2fa/verify-enable — confirm OTP to complete enable
  .post(
    "/verify-enable",
    async ({ body, user, set }: any) => {
      const valid = await verifyOtp(user.id, body.code, "enable_2fa");
      if (!valid) {
        set.status = 400;
        return err("Invalid or expired code");
      }
      await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, user.id));
      return ok({ message: "2FA enabled successfully" });
    },
    { body: t.Object({ code: t.String({ minLength: 6, maxLength: 6 }) }) }
  )

  // POST /auth/2fa/disable — send OTP to start disable flow
  .post("/disable", async ({ user, set }: any) => {
    const [row] = await db
      .select({ email: users.email, twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.id, user.id));
    if (!row?.email) {
      set.status = 400;
      return err("No email address on account");
    }
    if (!row.twoFactorEnabled) {
      set.status = 400;
      return err("2FA is not enabled");
    }
    await generateAndSendOtp(user.id, row.email, "disable_2fa");
    return ok({ message: "OTP sent to your email" });
  })

  // POST /auth/2fa/verify-disable — confirm OTP to complete disable
  .post(
    "/verify-disable",
    async ({ body, user, set }: any) => {
      const valid = await verifyOtp(user.id, body.code, "disable_2fa");
      if (!valid) {
        set.status = 400;
        return err("Invalid or expired code");
      }
      await db.update(users).set({ twoFactorEnabled: false }).where(eq(users.id, user.id));
      return ok({ message: "2FA disabled successfully" });
    },
    { body: t.Object({ code: t.String({ minLength: 6, maxLength: 6 }) }) }
  )

  // WS /auth/2fa/ws — OTP validation for login flow
  .ws("/ws", {
    open(ws) {
      (ws.data as any)._2fa = { userId: null as number | null };
    },

    async message(ws, raw) {
      let msg: any;
      try {
        msg = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        return;
      }

      const state = (ws.data as any)._2fa;

      // ── authenticate ────────────────────────────────────────────────────
      if (msg.type === "authenticate") {
        const payload = await verifyPendingToken(String(msg.pendingToken ?? ""));
        if (!payload || payload.type !== "2fa_pending") {
          ws.send(JSON.stringify({ type: "auth_error", message: "Invalid or expired session" }));
          ws.close();
          return;
        }
        state.userId = payload.sub;
        ws.send(JSON.stringify({ type: "authenticated", userId: state.userId }));
        return;
      }

      if (!state.userId) {
        ws.send(JSON.stringify({ type: "auth_error", message: "Not authenticated" }));
        return;
      }

      // ── submit_otp ──────────────────────────────────────────────────────
      if (msg.type === "submit_otp") {
        const code = String(msg.code ?? "").trim();
        const valid = await verifyOtp(state.userId, code, "login");
        if (!valid) {
          ws.send(JSON.stringify({ type: "otp_invalid", message: "Invalid or expired code" }));
          return;
        }
        const tokens = await signFullTokens(state.userId);
        if (!tokens) {
          ws.send(JSON.stringify({ type: "error", message: "User not found" }));
          return;
        }
        ws.send(JSON.stringify({ type: "otp_valid", ...tokens }));
        ws.close();
        return;
      }

      // ── resend_otp ──────────────────────────────────────────────────────
      if (msg.type === "resend_otp") {
        const [row] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, state.userId));
        if (row?.email) {
          await generateAndSendOtp(state.userId, row.email, "login");
        }
        ws.send(JSON.stringify({ type: "otp_resent" }));
        return;
      }

      ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
    },
  });

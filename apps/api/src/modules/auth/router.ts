import { Elysia, t } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "../../lib/db";
import { users, otpTokens } from "@rm/db";
import { eq, and, isNull } from "drizzle-orm";
import { ok, err } from "../../lib/response";
import { jwtPlugin, authenticate, getUserWithRoles } from "../../lib/auth";
import { sendOtpEmail } from "../../lib/email";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-set-in-env";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "changeme-refresh-set-in-env";
const JWT_2FA_SECRET = process.env.JWT_2FA_SECRET ?? "changeme-2fa-secret";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 3 * 24 * 60 * 60;

const refreshJwtPlugin = new Elysia({ name: "jwt-refresh-plugin" }).use(
  jwt({ name: "jwtRefresh", secret: JWT_REFRESH_SECRET })
);

const twoFaJwtPlugin = new Elysia({ name: "jwt-2fa-plugin" }).use(
  jwt({ name: "jwt2fa", secret: JWT_2FA_SECRET })
);

export const authRouter = new Elysia({ prefix: "/auth" })
  .use(jwtPlugin)
  .use(refreshJwtPlugin)
  .use(twoFaJwtPlugin)

  // POST /auth/login
  .post(
    "/login",
    async ({ body, jwt, jwtRefresh, jwt2fa, set }: any) => {
      const { email, password } = body;

      const [user] = await db.select().from(users).where(eq(users.email, email));
      if (!user || !user.passwordHash) {
        set.status = 401;
        return err("Invalid credentials");
      }
      if (!user.isActive) {
        set.status = 403;
        return err("Account is disabled");
      }

      const valid = await Bun.password.verify(password, user.passwordHash);
      if (!valid) {
        set.status = 401;
        return err("Invalid credentials");
      }

      // ── 2FA branch ────────────────────────────────────────────────────────
      if (user.twoFactorEnabled && user.email) {
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Invalidate previous unused login OTPs
        await db
          .update(otpTokens)
          .set({ usedAt: new Date() })
          .where(and(eq(otpTokens.userId, user.id), eq(otpTokens.purpose, "login"), isNull(otpTokens.usedAt)));

        await db.insert(otpTokens).values({ userId: user.id, code, purpose: "login", expiresAt });
        await sendOtpEmail(user.email, code);

        const pendingToken = await jwt2fa.sign({
          sub: user.id,
          type: "2fa_pending",
          exp: Math.floor(Date.now() / 1000) + 15 * 60,
        });

        return ok({ requires2fa: true, pendingToken });
      }

      // ── Normal login ───────────────────────────────────────────────────────
      const fullUser = await getUserWithRoles(user.id);
      if (!fullUser) {
        set.status = 500;
        return err("User data unavailable");
      }

      const payload = {
        sub: user.id,
        email: user.email ?? "",
        departmentId: user.departmentId ?? null,
        roles: fullUser.roles,
      };

      const accessToken = await jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS });
      const refreshToken = await jwtRefresh.sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) + REFRESH_TOKEN_TTL_SECONDS });

      return ok({
        requires2fa: false,
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.fullName,
          email: user.email ?? "",
          departmentId: user.departmentId ?? null,
          roles: fullUser.roles,
        },
      });
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
    }
  )

  // POST /auth/refresh
  .post(
    "/refresh",
    async ({ body, jwt, jwtRefresh, set }: any) => {
      const payload = await jwtRefresh.verify(body.refreshToken);
      if (!payload) {
        set.status = 401;
        return err("Invalid or expired refresh token");
      }

      const fullUser = await getUserWithRoles(payload.sub as number);
      if (!fullUser) {
        set.status = 401;
        return err("User not found");
      }

      const [userRow] = await db.select().from(users).where(eq(users.id, payload.sub as number));
      if (!userRow?.isActive) {
        set.status = 403;
        return err("Account is disabled");
      }

      const accessToken = await jwt.sign({
        sub: fullUser.id,
        email: fullUser.email ?? "",
        departmentId: fullUser.departmentId ?? null,
        roles: fullUser.roles,
        exp: Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
      });

      return ok({ accessToken });
    },
    {
      body: t.Object({ refreshToken: t.String() }),
    }
  )

  // GET /auth/me
  .use(authenticate)
  .get("/me", async ({ user }: any) => {
    const fullUser = await getUserWithRoles(user.id);
    if (!fullUser) return err("User not found");
    return ok({
      id: fullUser.id,
      name: fullUser.fullName,
      email: fullUser.email ?? "",
      departmentId: fullUser.departmentId,
      roles: fullUser.roles,
    });
  })

  // POST /auth/logout (stateless — client discards tokens)
  .post("/logout", () => ok({ loggedOut: true }));

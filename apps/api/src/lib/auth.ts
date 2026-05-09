import { Elysia } from "elysia";
import { jwt } from "@elysiajs/jwt";
import { db } from "./db";
import { users, roles, userRoles } from "@rm/db";
import { eq } from "drizzle-orm";
import type { AppRole } from "@rm/types";

const JWT_SECRET = process.env.JWT_SECRET ?? "changeme-set-in-env";

// Base JWT plugin — named so Elysia deduplicates when reused across many routers
export const jwtPlugin = new Elysia({ name: "jwt-plugin" }).use(
  jwt({ name: "jwt", secret: JWT_SECRET })
);

type UserCtx = {
  id: number;
  email: string;
  departmentId: number | null;
  roles: string[];
};

// authenticate — derive user from Bearer token (returns null if missing/invalid),
// then beforeHandle stops the chain with 401 if user is null
export const authenticate = new Elysia({ name: "authenticate" })
  .use(jwtPlugin)
  .derive({ as: "scoped" }, async ({ jwt, headers }: any) => {
    const authHeader = (headers["authorization"] ?? "") as string;
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return { user: null as UserCtx | null };
    const payload = await jwt.verify(token);
    if (!payload) return { user: null as UserCtx | null };
    return {
      user: {
        id: payload.sub as number,
        email: payload.email as string,
        departmentId: (payload.departmentId ?? null) as number | null,
        roles: (payload.roles ?? []) as string[],
      } as UserCtx,
    };
  })
  .onBeforeHandle({ as: "scoped" }, ({ user, set }: any) => {
    if (!user) {
      set.status = 401;
      return { success: false, error: "Missing or invalid access token" };
    }
  });

// authorize — role check on top of authenticate; ADMIN bypasses all
export function authorize(allowedRoles: AppRole[]) {
  return new Elysia({ name: `authorize-${allowedRoles.sort().join("-")}` })
    .use(authenticate)
    .onBeforeHandle({ as: "scoped" }, ({ user, set }: any) => {
      if (!user) return; // already handled by authenticate
      if (user.roles.includes("ADMIN")) return;
      const hasRole = allowedRoles.some((r: string) => user.roles.includes(r));
      if (!hasRole) {
        set.status = 403;
        return { success: false, error: "Insufficient permissions" };
      }
    });
}

// Helper — fetch user row + resolved roles array
export async function getUserWithRoles(userId: number) {
  const [userRow] = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      departmentId: users.departmentId,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!userRow) return null;

  const roleRows = await db
    .select({ code: roles.code })
    .from(userRoles)
    .innerJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(userRoles.userId, userId));

  return {
    ...userRow,
    roles: roleRows.map((r) => r.code),
  };
}

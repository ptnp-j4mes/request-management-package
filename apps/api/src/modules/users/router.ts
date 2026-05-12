import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { users, userRoles, roles } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

const PROFILE_FIELDS = ["fullName", "email", "companyName", "githubUsername"] as const;

export const usersRouter = new Elysia({ prefix: "/users" })
  .use(authenticate)
  .get("/", async () => {
    const data = await db.select().from(users).orderBy(users.fullName);
    const roleRows = await db
      .select({ userId: userRoles.userId, roleCode: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId));
    const roleMap: Record<number, string[]> = {};
    for (const r of roleRows) {
      if (!roleMap[r.userId]) roleMap[r.userId] = [];
      roleMap[r.userId].push(r.roleCode);
    }
    const result = data.map(({ passwordHash: _, ...u }: any) => ({ ...u, roles: roleMap[u.id] ?? [] }));
    return ok(result);
  })
  .get("/:id", async ({ params }: any) => {
    const [user] = await db.select().from(users).where(eq(users.id, Number(params.id)));
    if (!user) return err("User not found");
    return ok(user);
  })
  // ── Own profile update (no ADMIN required) ────────────────────────────────────
  .patch("/me", async ({ body, user }: any) => {
    const filtered = Object.fromEntries(
      Object.entries(body as Record<string, unknown>)
        .filter(([k]) => (PROFILE_FIELDS as readonly string[]).includes(k)),
    );
    const [updated] = await db
      .update(users)
      .set({ ...filtered, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning();
    if (!updated) return err("User not found");
    // Strip passwordHash from response
    const { passwordHash: _, ...safe } = updated as any;
    return ok(safe);
  })
  .use(authorize(["ADMIN"]))
  .post("/", async ({ body }: any) => {
    const [created] = await db.insert(users).values(body).returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }: any) => {
    const [updated] = await db.update(users).set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, Number(params.id))).returning();
    if (!updated) return err("User not found");
    return ok(updated);
  });

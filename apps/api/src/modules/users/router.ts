import { Elysia, t } from "elysia";
import { db } from "../../lib/db";
import { users } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";

export const usersRouter = new Elysia({ prefix: "/users" })
  .get("/", async () => {
    const data = await db.select().from(users).orderBy(users.fullName);
    return ok(data);
  })
  .get("/:id", async ({ params }) => {
    const [user] = await db.select().from(users).where(eq(users.id, Number(params.id)));
    if (!user) return err("User not found");
    return ok(user);
  })
  .post("/", async ({ body }) => {
    const [created] = await db.insert(users).values(body as any).returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }) => {
    const [updated] = await db.update(users).set({ ...(body as any), updatedAt: new Date() })
      .where(eq(users.id, Number(params.id))).returning();
    if (!updated) return err("User not found");
    return ok(updated);
  });

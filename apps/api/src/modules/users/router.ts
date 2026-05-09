import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { users } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

export const usersRouter = new Elysia({ prefix: "/users" })
  .use(authenticate)
  .get("/", async () => {
    const data = await db.select().from(users).orderBy(users.fullName);
    return ok(data);
  })
  .get("/:id", async ({ params }: any) => {
    const [user] = await db.select().from(users).where(eq(users.id, Number(params.id)));
    if (!user) return err("User not found");
    return ok(user);
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

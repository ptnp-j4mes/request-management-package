import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { maintenanceAgreements } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

export const maRouter = new Elysia({ prefix: "/maintenance-agreements" })
  .use(authenticate)
  .get("/", async ({ query }: any) => {
    const data = await db.select().from(maintenanceAgreements)
      .orderBy(maintenanceAgreements.startDate);
    return ok(data);
  })
  .get("/:id", async ({ params }) => {
    const [ma] = await db.select().from(maintenanceAgreements).where(eq(maintenanceAgreements.id, Number(params.id)));
    if (!ma) return err("MA not found");
    return ok(ma);
  })
  .use(authorize(["IT_MANAGER", "ADMIN"]))
  .post("/", async ({ body }: any) => {
    const [created] = await db.insert(maintenanceAgreements).values(body).returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }: any) => {
    const [updated] = await db.update(maintenanceAgreements)
      .set({ ...(body as any), updatedAt: new Date() })
      .where(eq(maintenanceAgreements.id, Number(params.id))).returning();
    if (!updated) return err("MA not found");
    return ok(updated);
  });

import { Elysia } from "elysia";
import dayjs from "dayjs";
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
    const projectId = Number(body?.projectId);
    const maType = String(body?.maType ?? "").trim();
    const startDate = body?.startDate ? dayjs(String(body.startDate)) : null;
    const endDate = body?.endDate ? dayjs(String(body.endDate)) : null;
    if (!Number.isFinite(projectId) || projectId <= 0) return err("projectId is required");
    if (!maType) return err("maType is required");
    if (!startDate || !startDate.isValid()) return err("startDate is required");
    if (!endDate || !endDate.isValid()) return err("endDate is required");
    const [created] = await db.insert(maintenanceAgreements).values({
      ...body,
      projectId,
      maType,
      startDate: startDate.format("YYYY-MM-DD"),
      endDate: endDate.format("YYYY-MM-DD"),
    }).returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }: any) => {
    const [updated] = await db.update(maintenanceAgreements)
      .set({ ...(body as any), updatedAt: new Date() })
      .where(eq(maintenanceAgreements.id, Number(params.id))).returning();
    if (!updated) return err("MA not found");
    return ok(updated);
  });

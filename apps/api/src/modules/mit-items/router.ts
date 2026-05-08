import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { mitItems, mitStepAssignments, mitStatusHistory, mitHandoffs } from "@rm/db";
import { ok, paginated, err } from "../../lib/response";
import { eq, and, ilike, count, desc } from "drizzle-orm";
import { assignMitItem, acceptMitItem, submitMitItem, returnMitItem } from "./service";

export const mitItemsRouter = new Elysia({ prefix: "/mit-items" })
  .get("/", async ({ query }: any) => {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.projectId) conditions.push(eq(mitItems.projectId, Number(query.projectId)));
    if (query.currentStepCode) conditions.push(eq(mitItems.currentStepCode, query.currentStepCode));
    if (query.currentStatus) conditions.push(eq(mitItems.currentStatus, query.currentStatus));
    if (query.currentOwnerUserId) conditions.push(eq(mitItems.currentOwnerUserId, Number(query.currentOwnerUserId)));
    if (query.search) conditions.push(ilike(mitItems.title, `%${query.search}%`));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ total }] = await db.select({ total: count() }).from(mitItems).where(where);
    const items = await db.select().from(mitItems)
      .where(where).orderBy(desc(mitItems.createdAt)).limit(limit).offset(offset);

    return paginated(items, total, page, limit);
  })
  .get("/:id", async ({ params }) => {
    const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, Number(params.id)));
    if (!mit) return err("MIT item not found");
    const assignments = await db.select().from(mitStepAssignments).where(eq(mitStepAssignments.mitItemId, mit.id));
    const history = await db.select().from(mitStatusHistory).where(eq(mitStatusHistory.mitItemId, mit.id));
    const handoffs = await db.select().from(mitHandoffs).where(eq(mitHandoffs.mitItemId, mit.id));
    return ok({ ...mit, assignments, history, handoffs });
  })
  .post("/", async ({ body }: any) => {
    const now = new Date();
    const year = now.getFullYear();
    const [{ total }] = await db.select({ total: count() }).from(mitItems);
    const mitNo = `MIT-${year}${String(Number(total) + 1).padStart(4, "0")}`;
    const [created] = await db.insert(mitItems).values({ ...body, mitNo, currentStatus: "new" }).returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }: any) => {
    const [updated] = await db.update(mitItems).set({ ...body, updatedAt: new Date() })
      .where(eq(mitItems.id, Number(params.id))).returning();
    if (!updated) return err("MIT item not found");
    return ok(updated);
  })
  // Workflow actions
  .post("/:id/assign", async ({ params, body }: any) => {
    try {
      const result = await assignMitItem(
        Number(params.id), body.stepId, body.userId, body.role, body.assignedBy ?? body.userId
      );
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  })
  .post("/:id/accept", async ({ params, body }: any) => {
    try {
      await acceptMitItem(Number(params.id), body.userId, body.action, body.note);
      return ok({ accepted: true });
    } catch (e: any) {
      return err(e.message);
    }
  })
  .post("/:id/submit", async ({ params, body }: any) => {
    try {
      const result = await submitMitItem(Number(params.id), body.fromUserId, body.toUserId, body.toStepId, body.note);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  })
  .post("/:id/return", async ({ params, body }: any) => {
    try {
      const result = await returnMitItem(Number(params.id), body.fromUserId, body.toStepId, body.toUserId, body.note);
      return ok(result);
    } catch (e: any) {
      return err(e.message);
    }
  })
  .post("/:id/deploy", async ({ params, body }: any) => {
    try {
      const mitId = Number(params.id);
      const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
      if (!mit) return err("MIT item not found");
      await db.update(mitItems).set({ currentStatus: "deployed", deployedAt: new Date(), updatedAt: new Date() }).where(eq(mitItems.id, mitId));
      await db.insert(mitStatusHistory).values({ mitItemId: mitId, oldStatus: mit.currentStatus, newStatus: "deployed", changedBy: body.userId, remark: body.note ?? null });
      return ok({ deployed: true });
    } catch (e: any) {
      return err(e.message);
    }
  });

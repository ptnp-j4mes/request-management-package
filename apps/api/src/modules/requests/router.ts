import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { requests, requestComments, requestStatusHistory } from "@rm/db";
import { ok, paginated, err } from "../../lib/response";
import { eq, and, ilike, count, desc } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

export const requestsRouter = new Elysia({ prefix: "/requests" })
  .use(authenticate)
  .get("/", async ({ query, user }: any) => {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (query.projectId) conditions.push(eq(requests.projectId, Number(query.projectId)));
    if (query.requestType) conditions.push(eq(requests.requestType, query.requestType));
    if (query.status) conditions.push(eq(requests.status, query.status));
    if (query.priority) conditions.push(eq(requests.priority, query.priority));
    if (query.assignedUserId) conditions.push(eq(requests.assignedUserId, Number(query.assignedUserId)));
    if (query.search) conditions.push(ilike(requests.subject, `%${query.search}%`));

    // Requesters without elevated roles see only their own requests
    const isRestricted = user.roles.includes("REQUESTER") &&
      !user.roles.some((r: string) => ["ADMIN", "IT_MANAGER", "BA"].includes(r));
    if (isRestricted) conditions.push(eq(requests.requesterUserId, user.id));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db.select({ total: count() }).from(requests).where(where);
    const items = await db.select().from(requests)
      .where(where)
      .orderBy(desc(requests.createdAt))
      .limit(limit)
      .offset(offset);

    return paginated(items, total, page, limit);
  })
  .get("/:id", async ({ params }: any) => {
    const [request] = await db.select().from(requests).where(eq(requests.id, Number(params.id)));
    if (!request) return err("Request not found");
    const comments = await db.select().from(requestComments).where(eq(requestComments.requestId, request.id));
    const history = await db.select().from(requestStatusHistory).where(eq(requestStatusHistory.requestId, request.id));
    return ok({ ...request, comments, history });
  })
  .post("/", async ({ body }: any) => {
    const now = new Date();
    const year = now.getFullYear();
    const [{ total }] = await db.select({ total: count() }).from(requests);
    const requestNo = `REQ-${year}${String(Number(total) + 1).padStart(4, "0")}`;
    const [created] = await db.insert(requests).values({ ...body, requestNo }).returning();
    return ok(created);
  })
  .use(authorize(["APPROVER", "BA", "IT_MANAGER", "ADMIN"]))
  .patch("/:id", async ({ params, body }: any) => {
    const [existing] = await db.select().from(requests).where(eq(requests.id, Number(params.id)));
    if (!existing) return err("Request not found");
    const [updated] = await db.update(requests).set({ ...body, updatedAt: new Date() })
      .where(eq(requests.id, Number(params.id))).returning();
    if (body.status && body.status !== existing.status) {
      await db.insert(requestStatusHistory).values({
        requestId: existing.id,
        oldStatus: existing.status,
        newStatus: body.status,
        changedBy: body.changedBy ?? null,
      });
    }
    return ok(updated);
  })
  .post("/:id/comments", async ({ params, body }: any) => {
    const [comment] = await db.insert(requestComments).values({
      requestId: Number(params.id),
      ...body,
    }).returning();
    return ok(comment);
  })
  .get("/:id/comments", async ({ params }: any) => {
    const data = await db.select().from(requestComments)
      .where(eq(requestComments.requestId, Number(params.id)));
    return ok(data);
  });

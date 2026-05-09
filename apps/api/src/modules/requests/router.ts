import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { requests, requestComments, requestStatusHistory } from "@rm/db";
import { ok, paginated, err } from "../../lib/response";
import { eq, and, ilike, count, desc } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";

// ── helpers ──────────────────────────────────────────────────────────────────

async function getRequest(id: number) {
  const [req] = await db.select().from(requests).where(eq(requests.id, id));
  return req ?? null;
}

async function transition(
  requestId: number,
  oldStatus: string,
  newStatus: string,
  changedBy: number | null,
  extra: Record<string, unknown> = {},
) {
  const [updated] = await db
    .update(requests)
    .set({ status: newStatus, updatedAt: new Date(), ...extra })
    .where(eq(requests.id, requestId))
    .returning();
  await db.insert(requestStatusHistory).values({
    requestId,
    oldStatus,
    newStatus,
    changedBy,
  });
  return updated;
}

// ── router ───────────────────────────────────────────────────────────────────

export const requestsRouter = new Elysia({ prefix: "/requests" })
  .use(authenticate)

  // ── list ──
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

    const isRestricted =
      user.roles.includes("REQUESTER") &&
      !user.roles.some((r: string) => ["ADMIN", "IT_MANAGER", "BA"].includes(r));
    if (isRestricted) conditions.push(eq(requests.requesterUserId, user.id));

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [{ total }] = await db.select({ total: count() }).from(requests).where(where);
    const items = await db
      .select()
      .from(requests)
      .where(where)
      .orderBy(desc(requests.createdAt))
      .limit(limit)
      .offset(offset);

    return paginated(items, total, page, limit);
  })

  // ── get one ──
  .get("/:id", async ({ params }: any) => {
    const request = await getRequest(Number(params.id));
    if (!request) return err("Request not found");
    const comments = await db
      .select()
      .from(requestComments)
      .where(eq(requestComments.requestId, request.id));
    const history = await db
      .select()
      .from(requestStatusHistory)
      .where(eq(requestStatusHistory.requestId, request.id));
    return ok({ ...request, comments, history });
  })

  // ── create ──
  .post("/", async ({ body, user }: any) => {
    const now = new Date();
    const year = now.getFullYear();
    const [{ total }] = await db.select({ total: count() }).from(requests);
    const requestNo = `REQ-${year}${String(Number(total) + 1).padStart(4, "0")}`;
    const [created] = await db
      .insert(requests)
      .values({ ...body, requestNo, requesterUserId: body.requesterUserId ?? user.id, status: "draft" })
      .returning();
    return ok(created);
  })

  // ── update (managers / BA / approver) — scoped sub-router so the guard
  //    does not bleed onto workflow action routes below ──
  .use(
    new Elysia()
      .use(authorize(["APPROVER", "BA", "IT_MANAGER", "ADMIN"]))
      .patch("/:id", async ({ params, body, user }: any) => {
        const existing = await getRequest(Number(params.id));
        if (!existing) return err("Request not found");
        const [updated] = await db
          .update(requests)
          .set({ ...body, updatedAt: new Date() })
          .where(eq(requests.id, Number(params.id)))
          .returning();
        if (body.status && body.status !== existing.status) {
          await db.insert(requestStatusHistory).values({
            requestId: existing.id,
            oldStatus: existing.status,
            newStatus: body.status,
            changedBy: user.id,
          });
        }
        return ok(updated);
      }),
  )

  // ── comments ──
  .post("/:id/comments", async ({ params, body, user }: any) => {
    const [comment] = await db
      .insert(requestComments)
      .values({ requestId: Number(params.id), createdBy: user.id, ...body })
      .returning();
    return ok(comment);
  })
  .get("/:id/comments", async ({ params }: any) => {
    const data = await db
      .select()
      .from(requestComments)
      .where(eq(requestComments.requestId, Number(params.id)));
    return ok(data);
  })

  // ── workflow actions (authenticated, ownership / role checked inline) ──

  // submit — any authenticated user who owns the draft
  .post("/:id/submit", async ({ params, user }: any) => {
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "draft") return err(`Cannot submit from status '${req.status}'`);
    if (req.requesterUserId !== user.id && !user.roles.includes("ADMIN") && !user.roles.includes("IT_MANAGER")) {
      return err("Only the requester can submit this request", 403);
    }
    const updated = await transition(req.id, req.status, "submitted", user.id, { submittedAt: new Date() });
    return ok(updated);
  })

  // approve — APPROVER (own dept), IT_MANAGER, ADMIN
  .post("/:id/approve", async ({ params, user, set }: any) => {
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      !user.roles.includes("APPROVER")
    ) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "submitted") return err(`Cannot approve from status '${req.status}'`);
    const updated = await transition(req.id, req.status, "manager_approved", user.id, {
      approverId: user.id,
      approvedAt: new Date(),
    });
    return ok(updated);
  })

  // reject — APPROVER, BA, IT_MANAGER, ADMIN
  .post("/:id/reject", async ({ params, body, user, set }: any) => {
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      !user.roles.includes("APPROVER") &&
      !user.roles.includes("BA") &&
      !user.roles.includes("QA")
    ) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    const allowedFromStatuses = ["submitted", "manager_approved", "ba_review", "in_qa"];
    if (!allowedFromStatuses.includes(req.status)) {
      return err(`Cannot reject from status '${req.status}'`);
    }
    const [updated] = await db
      .update(requests)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(requests.id, req.id))
      .returning();
    await db.insert(requestStatusHistory).values({
      requestId: req.id,
      oldStatus: req.status,
      newStatus: "rejected",
      changedBy: user.id,
      remark: body?.reason ?? null,
    });
    return ok(updated);
  })

  // assign-ba — IT_MANAGER, ADMIN
  .post("/:id/assign-ba", async ({ params, body, user, set }: any) => {
    if (!user.roles.includes("ADMIN") && !user.roles.includes("IT_MANAGER")) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (!["manager_approved", "ba_review"].includes(req.status)) {
      return err(`Cannot assign BA from status '${req.status}'`);
    }
    const updated = await transition(req.id, req.status, "ba_review", user.id, {
      baOwnerId: Number(body.baUserId),
    });
    return ok(updated);
  })

  // assign-dev — IT_MANAGER, ADMIN
  .post("/:id/assign-dev", async ({ params, body, user, set }: any) => {
    if (!user.roles.includes("ADMIN") && !user.roles.includes("IT_MANAGER")) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (!["ba_review", "waiting_estimate"].includes(req.status)) {
      return err(`Cannot assign developer from status '${req.status}'`);
    }
    const updated = await transition(req.id, req.status, "assigned_to_dev", user.id, {
      devOwnerId: Number(body.devUserId),
    });
    return ok(updated);
  })

  // assign-qa — IT_MANAGER, ADMIN
  .post("/:id/assign-qa", async ({ params, body, user, set }: any) => {
    if (!user.roles.includes("ADMIN") && !user.roles.includes("IT_MANAGER")) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (!["ready_for_qa", "in_qa"].includes(req.status)) {
      return err(`Cannot assign QA from status '${req.status}'`);
    }
    const updated = await transition(req.id, req.status, "in_qa", user.id, {
      qaOwnerId: Number(body.qaUserId),
    });
    return ok(updated);
  })

  // start-development — DEVELOPER or FULLSTACK who is assigned as devOwner
  .post("/:id/start-development", async ({ params, user, set }: any) => {
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      !user.roles.includes("DEVELOPER") &&
      !user.roles.includes("FULLSTACK")
    ) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "assigned_to_dev") return err(`Cannot start development from status '${req.status}'`);
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      req.devOwnerId !== user.id
    ) {
      set.status = 403;
      return err("You are not the assigned developer");
    }
    const updated = await transition(req.id, req.status, "in_development", user.id);
    return ok(updated);
  })

  // ready-for-qa — DEVELOPER or FULLSTACK (devOwner)
  .post("/:id/ready-for-qa", async ({ params, user, set }: any) => {
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      !user.roles.includes("DEVELOPER") &&
      !user.roles.includes("FULLSTACK")
    ) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "in_development") return err(`Cannot mark ready-for-QA from status '${req.status}'`);
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      req.devOwnerId !== user.id
    ) {
      set.status = 403;
      return err("You are not the assigned developer");
    }
    const updated = await transition(req.id, req.status, "ready_for_qa", user.id);
    return ok(updated);
  })

  // qa-pass — QA (qaOwner), IT_MANAGER, ADMIN
  .post("/:id/qa-pass", async ({ params, user, set }: any) => {
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      !user.roles.includes("QA")
    ) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "in_qa") return err(`Cannot mark QA pass from status '${req.status}'`);
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      req.qaOwnerId !== user.id
    ) {
      set.status = 403;
      return err("You are not the assigned QA");
    }
    const updated = await transition(req.id, req.status, "uat", user.id);
    return ok(updated);
  })

  // qa-fail — QA (qaOwner), IT_MANAGER, ADMIN
  .post("/:id/qa-fail", async ({ params, body, user, set }: any) => {
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      !user.roles.includes("QA")
    ) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "in_qa") return err(`Cannot mark QA fail from status '${req.status}'`);
    if (
      !user.roles.includes("ADMIN") &&
      !user.roles.includes("IT_MANAGER") &&
      req.qaOwnerId !== user.id
    ) {
      set.status = 403;
      return err("You are not the assigned QA");
    }
    const [updated] = await db
      .update(requests)
      .set({ status: "in_development", updatedAt: new Date() })
      .where(eq(requests.id, req.id))
      .returning();
    await db.insert(requestStatusHistory).values({
      requestId: req.id,
      oldStatus: req.status,
      newStatus: "in_development",
      changedBy: user.id,
      remark: body?.reason ?? null,
    });
    return ok(updated);
  })

  // uat-approve — REQUESTER (must be owner), APPROVER, IT_MANAGER, ADMIN
  .post("/:id/uat-approve", async ({ params, user, set }: any) => {
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    if (req.status !== "uat") return err(`Cannot UAT-approve from status '${req.status}'`);

    const isOwner = req.requesterUserId === user.id;
    const hasRole =
      user.roles.includes("ADMIN") ||
      user.roles.includes("IT_MANAGER") ||
      user.roles.includes("APPROVER");

    if (!isOwner && !hasRole) {
      set.status = 403;
      return err("Only the requester or an approver can confirm UAT");
    }
    const updated = await transition(req.id, req.status, "completed", user.id, {
      completedAt: new Date(),
      resolvedAt: new Date(),
    });
    return ok(updated);
  })

  // close — IT_MANAGER, ADMIN
  .post("/:id/close", async ({ params, user, set }: any) => {
    if (!user.roles.includes("ADMIN") && !user.roles.includes("IT_MANAGER")) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const req = await getRequest(Number(params.id));
    if (!req) return err("Request not found");
    const updated = await transition(req.id, req.status, "closed", user.id, {
      closedAt: new Date(),
    });
    return ok(updated);
  });

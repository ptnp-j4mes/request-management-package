import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { uatCycles, uatTestCases, uatTestResults, uatCycleComments, users } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq, asc, and } from "drizzle-orm";
import { authenticate } from "../../lib/auth";
import dayjs from "dayjs";

export const uatRouter = new Elysia({ prefix: "/uat" })
  .use(authenticate)
  // Cycles
  .get("/cycles", async () => {
    return ok(await db.select().from(uatCycles).orderBy(uatCycles.startDate));
  })
  .get("/cycles/:id", async ({ params }) => {
    const [cycle] = await db.select().from(uatCycles).where(eq(uatCycles.id, Number(params.id)));
    if (!cycle) return err("UAT cycle not found");
    const testResults = await db.select().from(uatTestResults).where(eq(uatTestResults.uatCycleId, cycle.id));
    return ok({ ...cycle, testResults });
  })
  .post("/cycles", async ({ body }) => {
    const projectId = Number(body?.projectId);
    const cycleName = String(body?.cycleName ?? "").trim();
    const startDate = body?.startDate ? dayjs(String(body.startDate)) : null;
    const endDate = body?.endDate ? dayjs(String(body.endDate)) : null;
    if (!Number.isFinite(projectId) || projectId <= 0) return err("projectId is required");
    if (!cycleName) return err("cycleName is required");
    const [created] = await db.insert(uatCycles).values({
      ...body,
      projectId,
      cycleName,
      startDate: startDate && startDate.isValid() ? startDate.format("YYYY-MM-DD") : null,
      endDate: endDate && endDate.isValid() ? endDate.format("YYYY-MM-DD") : null,
    } as any).returning();
    return ok(created);
  })
  .patch("/cycles/:id", async ({ params, body }) => {
    const [updated] = await db.update(uatCycles).set({ ...(body as any), updatedAt: new Date() })
      .where(eq(uatCycles.id, Number(params.id))).returning();
    if (!updated) return err("UAT cycle not found");
    return ok(updated);
  })
  // Test Cases
  .get("/test-cases", async () => {
    return ok(await db.select().from(uatTestCases).orderBy(uatTestCases.testCaseCode));
  })
  .post("/test-cases", async ({ body }) => {
    const projectId = Number(body?.projectId);
    const testCaseCode = String(body?.testCaseCode ?? "").trim();
    const title = String(body?.title ?? "").trim();
    if (!Number.isFinite(projectId) || projectId <= 0) return err("projectId is required");
    if (!testCaseCode || !title) return err("testCaseCode and title are required");
    const [created] = await db.insert(uatTestCases).values({ ...body, projectId, testCaseCode, title } as any).returning();
    return ok(created);
  })
  // Test Results
  .get("/test-results", async () => {
    return ok(await db.select().from(uatTestResults).orderBy(uatTestResults.createdAt));
  })
  .post("/test-results", async ({ body }) => {
    const uatCycleId = Number(body?.uatCycleId);
    const testCaseId = Number(body?.testCaseId);
    const resultStatus = String(body?.resultStatus ?? "").trim();
    if (!Number.isFinite(uatCycleId) || uatCycleId <= 0) return err("uatCycleId is required");
    if (!Number.isFinite(testCaseId) || testCaseId <= 0) return err("testCaseId is required");
    if (!resultStatus) return err("resultStatus is required");
    const testDate = body?.testDate ? dayjs(String(body.testDate)) : null;
    const [created] = await db.insert(uatTestResults).values({
      ...body,
      uatCycleId,
      testCaseId,
      resultStatus,
      testDate: testDate && testDate.isValid() ? testDate.toDate() : null,
    } as any).returning();
    return ok(created);
  })
  // Project-scoped UAT routes
  .get("/projects/:id/uat/cycles", async ({ params }: any) => {
    return ok(await db.select().from(uatCycles).where(eq(uatCycles.projectId, Number(params.id))).orderBy(uatCycles.startDate));
  })
  .post("/projects/:id/uat/cycles", async ({ params, body }: any) => {
    const cycleName = String(body?.cycleName ?? "").trim();
    const startDate = body?.startDate ? dayjs(String(body.startDate)) : null;
    const endDate = body?.endDate ? dayjs(String(body.endDate)) : null;
    if (!cycleName) return err("cycleName is required");
    const [created] = await db.insert(uatCycles).values({
      ...(body as any),
      projectId: Number(params.id),
      cycleName,
      startDate: startDate && startDate.isValid() ? startDate.format("YYYY-MM-DD") : null,
      endDate: endDate && endDate.isValid() ? endDate.format("YYYY-MM-DD") : null,
    }).returning();
    return ok(created);
  })
  .get("/projects/:id/uat/test-cases", async ({ params }: any) => {
    return ok(await db.select().from(uatTestCases).where(eq(uatTestCases.projectId, Number(params.id))).orderBy(uatTestCases.testCaseCode));
  })
  .post("/projects/:id/uat/test-cases", async ({ params, body }: any) => {
    const testCaseCode = String(body?.testCaseCode ?? "").trim();
    const title = String(body?.title ?? "").trim();
    if (!testCaseCode || !title) return err("testCaseCode and title are required");
    const [created] = await db.insert(uatTestCases).values({ ...(body as any), projectId: Number(params.id), testCaseCode, title }).returning();
    return ok(created);
  })
  .get("/projects/:id/uat/test-results", async ({ params }: any) => {
    return ok(
      await db
        .select()
        .from(uatTestResults)
        .innerJoin(uatCycles, eq(uatCycles.id, uatTestResults.uatCycleId))
        .where(eq(uatCycles.projectId, Number(params.id)))
    );
  })
  .get("/projects/:id/uat/cycles/:cycleId/comments", async ({ params }: any) => {
    const cycleId = Number(params.cycleId);
    const comments = await db
      .select({
        id: uatCycleComments.id,
        uatCycleId: uatCycleComments.uatCycleId,
        testCaseId: uatCycleComments.testCaseId,
        createdByUserId: uatCycleComments.createdByUserId,
        createdByName: users.fullName,
        commentText: uatCycleComments.commentText,
        commentType: uatCycleComments.commentType,
        severity: uatCycleComments.severity,
        status: uatCycleComments.status,
        linkedRequestId: uatCycleComments.linkedRequestId,
        linkedMitItemId: uatCycleComments.linkedMitItemId,
        linkedProjectTaskId: uatCycleComments.linkedProjectTaskId,
        createdAt: uatCycleComments.createdAt,
        updatedAt: uatCycleComments.updatedAt,
      })
      .from(uatCycleComments)
      .leftJoin(users, eq(users.id, uatCycleComments.createdByUserId))
      .where(eq(uatCycleComments.uatCycleId, cycleId))
      .orderBy(asc(uatCycleComments.createdAt));
    return ok(comments);
  })
  .post("/projects/:id/uat/cycles/:cycleId/comments", async ({ params, body, user }: any) => {
    const cycleId = Number(params.cycleId);
    const [cycle] = await db.select().from(uatCycles).where(and(eq(uatCycles.id, cycleId), eq(uatCycles.projectId, Number(params.id))));
    if (!cycle) return err("UAT cycle not found");

    const { commentText, commentType = "comment", testCaseId, severity, linkedRequestId, linkedMitItemId, linkedProjectTaskId } = body as any;
    if (!commentText?.trim()) return err("commentText is required");

    const [created] = await db.insert(uatCycleComments).values({
      uatCycleId: cycleId,
      testCaseId: testCaseId ?? null,
      createdByUserId: user.id,
      commentText: commentText.trim(),
      commentType,
      severity: severity ?? null,
      status: "open",
      linkedRequestId: linkedRequestId ?? null,
      linkedMitItemId: linkedMitItemId ?? null,
      linkedProjectTaskId: linkedProjectTaskId ?? null,
    }).returning();
    return ok(created);
  })
  // UAT Cycle Comments & Defects
  .get("/cycles/:id/comments", async ({ params }) => {
    const cycleId = Number(params.id);
    const comments = await db
      .select({
        id: uatCycleComments.id,
        uatCycleId: uatCycleComments.uatCycleId,
        testCaseId: uatCycleComments.testCaseId,
        createdByUserId: uatCycleComments.createdByUserId,
        createdByName: users.fullName,
        commentText: uatCycleComments.commentText,
        commentType: uatCycleComments.commentType,
        severity: uatCycleComments.severity,
        status: uatCycleComments.status,
        linkedRequestId: uatCycleComments.linkedRequestId,
        linkedMitItemId: uatCycleComments.linkedMitItemId,
        linkedProjectTaskId: uatCycleComments.linkedProjectTaskId,
        createdAt: uatCycleComments.createdAt,
        updatedAt: uatCycleComments.updatedAt,
      })
      .from(uatCycleComments)
      .leftJoin(users, eq(users.id, uatCycleComments.createdByUserId))
      .where(eq(uatCycleComments.uatCycleId, cycleId))
      .orderBy(asc(uatCycleComments.createdAt));
    return ok(comments);
  })
  .post("/cycles/:id/comments", async ({ params, body, user }: any) => {
    const cycleId = Number(params.id);
    const [cycle] = await db.select().from(uatCycles).where(eq(uatCycles.id, cycleId));
    if (!cycle) return err("UAT cycle not found");

    const { commentText, commentType = "comment", testCaseId, severity, linkedRequestId, linkedMitItemId, linkedProjectTaskId } = body as any;
    if (!commentText?.trim()) return err("commentText is required");

    const [created] = await db.insert(uatCycleComments).values({
      uatCycleId: cycleId,
      testCaseId: testCaseId ?? null,
      createdByUserId: user.id,
      commentText: commentText.trim(),
      commentType,
      severity: severity ?? null,
      linkedRequestId: linkedRequestId ?? null,
      linkedMitItemId: linkedMitItemId ?? null,
      linkedProjectTaskId: linkedProjectTaskId ?? null,
    }).returning();
    return ok(created);
  })
  .patch("/cycles/:id/comments/:commentId", async ({ params, body }: any) => {
    const { status } = body as any;
    const [updated] = await db
      .update(uatCycleComments)
      .set({ status, updatedAt: new Date() })
      .where(eq(uatCycleComments.id, Number(params.commentId)))
      .returning();
    if (!updated) return err("Comment not found");
    return ok(updated);
  });

import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { uatCycles, uatTestCases, uatTestResults, uatCycleComments, users } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq, asc } from "drizzle-orm";
import { authenticate } from "../../lib/auth";

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
    const [created] = await db.insert(uatCycles).values(body as any).returning();
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
    const [created] = await db.insert(uatTestCases).values(body as any).returning();
    return ok(created);
  })
  // Test Results
  .get("/test-results", async () => {
    return ok(await db.select().from(uatTestResults).orderBy(uatTestResults.createdAt));
  })
  .post("/test-results", async ({ body }) => {
    const [created] = await db.insert(uatTestResults).values(body as any).returning();
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

    const { commentText, commentType = "comment", testCaseId, severity, linkedRequestId } = body as any;
    if (!commentText?.trim()) return err("commentText is required");

    const [created] = await db.insert(uatCycleComments).values({
      uatCycleId: cycleId,
      testCaseId: testCaseId ?? null,
      createdByUserId: user.id,
      commentText: commentText.trim(),
      commentType,
      severity: severity ?? null,
      linkedRequestId: linkedRequestId ?? null,
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

import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { uatCycles, uatTestCases, uatTestResults } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq } from "drizzle-orm";
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
  });

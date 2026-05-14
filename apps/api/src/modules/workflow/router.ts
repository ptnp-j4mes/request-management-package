import { Elysia } from "elysia";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { ok, err } from "../../lib/response";
import { authenticate, authorize } from "../../lib/auth";
import { workflowDefinitions, workflowSteps, mitItems, mitStepAssignments, mitHandoffs, mitAcceptanceLogs } from "@rm/db";
import {
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  CreateWorkflowStepSchema,
  UpdateWorkflowStepSchema,
  ReorderWorkflowStepsSchema,
} from "@rm/types";

function normalizeStepCode(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .toUpperCase();
}

async function getDefaultWorkflowId() {
  const [defaultWorkflow] = await db
    .select({ id: workflowDefinitions.id })
    .from(workflowDefinitions)
    .where(eq(workflowDefinitions.isDefault, true))
    .limit(1);
  return defaultWorkflow?.id ?? null;
}

async function listWorkflowsWithStepCount() {
  const workflows = await db.select().from(workflowDefinitions).orderBy(workflowDefinitions.createdAt);
  const steps = await db.select({ workflowId: workflowSteps.workflowId, count: sql<number>`count(*)::int` }).from(workflowSteps).groupBy(workflowSteps.workflowId);
  const stepCountMap = new Map<number, number>(steps.map((row) => [Number(row.workflowId), row.count]));

  return workflows.map((workflow) => ({
    ...workflow,
    stepCount: stepCountMap.get(workflow.id) ?? 0,
  }));
}

async function getWorkflowSteps(workflowId: number) {
  return db
    .select({
      id: workflowSteps.id,
      workflowId: workflowSteps.workflowId,
      stepCode: workflowSteps.stepCode,
      stepName: workflowSteps.stepName,
      stepOrder: workflowSteps.stepOrder,
      isTerminal: workflowSteps.isTerminal,
    })
    .from(workflowSteps)
    .where(eq(workflowSteps.workflowId, workflowId))
    .orderBy(workflowSteps.stepOrder);
}

async function ensureStepOrderUnique(workflowId: number, stepOrder: number, ignoreStepId?: number) {
  const conditions = [eq(workflowSteps.workflowId, workflowId), eq(workflowSteps.stepOrder, stepOrder)];
  if (ignoreStepId) {
    conditions.push(sql`${workflowSteps.id} <> ${ignoreStepId}`);
  }
  const rows = await db.select({ id: workflowSteps.id }).from(workflowSteps).where(and(...conditions));
  return rows.length === 0;
}

async function ensureStepCodeUnique(workflowId: number, stepCode: string, ignoreStepId?: number) {
  const conditions = [eq(workflowSteps.workflowId, workflowId), eq(workflowSteps.stepCode, stepCode)];
  if (ignoreStepId) {
    conditions.push(sql`${workflowSteps.id} <> ${ignoreStepId}`);
  }
  const rows = await db.select({ id: workflowSteps.id }).from(workflowSteps).where(and(...conditions));
  return rows.length === 0;
}

async function workflowHasReferences(workflowId: number) {
  const stepIds = await db
    .select({ id: workflowSteps.id })
    .from(workflowSteps)
    .where(eq(workflowSteps.workflowId, workflowId));

  if (stepIds.length === 0) return false;
  const ids = stepIds.map((row) => row.id);

  const [currentStepRefs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mitItems)
    .where(inArray(mitItems.currentStepId, ids));

  const [assignmentRefs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mitStepAssignments)
    .where(inArray(mitStepAssignments.stepId, ids));

  const [handoffFromRefs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mitHandoffs)
    .where(inArray(mitHandoffs.fromStepId, ids));

  const [handoffToRefs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mitHandoffs)
    .where(inArray(mitHandoffs.toStepId, ids));

  const [acceptanceRefs] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mitAcceptanceLogs)
    .where(inArray(mitAcceptanceLogs.stepId, ids));

  return [currentStepRefs, assignmentRefs, handoffFromRefs, handoffToRefs, acceptanceRefs].some(
    (row) => (row?.count ?? 0) > 0,
  );
}

export const workflowRouter = new Elysia()
  .use(authenticate)
  .get("/workflow-steps", async () => {
    const defaultWorkflowId = await getDefaultWorkflowId();
    const steps = defaultWorkflowId
      ? await getWorkflowSteps(defaultWorkflowId)
      : await db
        .select({
          id: workflowSteps.id,
          workflowId: workflowSteps.workflowId,
          stepCode: workflowSteps.stepCode,
          stepName: workflowSteps.stepName,
          stepOrder: workflowSteps.stepOrder,
          isTerminal: workflowSteps.isTerminal,
        })
        .from(workflowSteps)
        .orderBy(workflowSteps.workflowId, workflowSteps.stepOrder);

    return ok(steps);
  })
  .get("/workflows", async () => {
    return ok(await listWorkflowsWithStepCount());
  })
  .get("/workflows/:id", async ({ params, set }: any) => {
    const workflowId = Number(params.id);
    const [workflow] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, workflowId)).limit(1);
    if (!workflow) {
      set.status = 404;
      return err("Workflow not found");
    }

    const steps = await getWorkflowSteps(workflowId);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(workflowSteps)
      .where(eq(workflowSteps.workflowId, workflowId));

    return ok({ ...workflow, stepCount: count ?? 0, steps });
  })
  .use(authorize(["ADMIN"]))
  .post("/workflows", async ({ body, set }: any) => {
    const parsed = CreateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid workflow payload", parsed.error.flatten());
    }

    const created = await db.transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.update(workflowDefinitions).set({ isDefault: false }).where(eq(workflowDefinitions.isDefault, true));
      }

      const [workflow] = await tx
        .insert(workflowDefinitions)
        .values({
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          isDefault: parsed.data.isDefault ?? false,
        })
        .returning();

      return workflow;
    });

    return ok(created);
  })
  .patch("/workflows/:id", async ({ params, body, set }: any) => {
    const workflowId = Number(params.id);
    const parsed = UpdateWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid workflow payload", parsed.error.flatten());
    }

    const [existing] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, workflowId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("Workflow not found");
    }

    if (
      parsed.data.name === undefined &&
      parsed.data.description === undefined &&
      parsed.data.isDefault === undefined
    ) {
      return ok(existing);
    }

    const updated = await db.transaction(async (tx) => {
      if (parsed.data.isDefault) {
        await tx.update(workflowDefinitions).set({ isDefault: false }).where(eq(workflowDefinitions.isDefault, true));
      }
      const [row] = await tx
        .update(workflowDefinitions)
        .set({
          ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
          ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
          ...(parsed.data.isDefault !== undefined ? { isDefault: parsed.data.isDefault } : {}),
        })
        .where(eq(workflowDefinitions.id, workflowId))
        .returning();
      return row;
    });

    return ok(updated);
  })
  .delete("/workflows/:id", async ({ params, set }: any) => {
    const workflowId = Number(params.id);
    const [existing] = await db.select().from(workflowDefinitions).where(eq(workflowDefinitions.id, workflowId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("Workflow not found");
    }

    const hasRefs = await workflowHasReferences(workflowId);
    if (hasRefs) {
      set.status = 409;
      return err("Cannot delete workflow while it is referenced by MIT items");
    }

    await db.delete(workflowDefinitions).where(eq(workflowDefinitions.id, workflowId));
    return ok({ deleted: true });
  })
  .post("/workflows/:id/steps", async ({ params, body, set }: any) => {
    const workflowId = Number(params.id);
    const parsed = CreateWorkflowStepSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid workflow step payload", parsed.error.flatten());
    }

    const [workflow] = await db.select({ id: workflowDefinitions.id }).from(workflowDefinitions).where(eq(workflowDefinitions.id, workflowId)).limit(1);
    if (!workflow) {
      set.status = 404;
      return err("Workflow not found");
    }

    const stepCode = normalizeStepCode(parsed.data.stepCode);
    const uniqueOrder = await ensureStepOrderUnique(workflowId, parsed.data.stepOrder);
    if (!uniqueOrder) {
      set.status = 409;
      return err("Step order already exists for this workflow");
    }

    const uniqueCode = await ensureStepCodeUnique(workflowId, stepCode);
    if (!uniqueCode) {
      set.status = 409;
      return err("Step code already exists for this workflow");
    }

    const [created] = await db
      .insert(workflowSteps)
      .values({
        workflowId,
        stepCode,
        stepName: parsed.data.stepName,
        stepOrder: parsed.data.stepOrder,
        isTerminal: parsed.data.isTerminal ?? false,
      })
      .returning();

    return ok(created);
  })
  .patch("/workflow-steps/:stepId", async ({ params, body, set }: any) => {
    const stepId = Number(params.stepId);
    const parsed = UpdateWorkflowStepSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid workflow step payload", parsed.error.flatten());
    }

    const [existing] = await db.select().from(workflowSteps).where(eq(workflowSteps.id, stepId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("Workflow step not found");
    }

    if (
      parsed.data.stepCode === undefined &&
      parsed.data.stepName === undefined &&
      parsed.data.stepOrder === undefined &&
      parsed.data.isTerminal === undefined
    ) {
      return ok(existing);
    }

    const nextStepCode = parsed.data.stepCode !== undefined ? normalizeStepCode(parsed.data.stepCode) : existing.stepCode;
    const nextStepOrder = parsed.data.stepOrder ?? existing.stepOrder;

    if (!(await ensureStepOrderUnique(Number(existing.workflowId), nextStepOrder, stepId))) {
      set.status = 409;
      return err("Step order already exists for this workflow");
    }

    if (!(await ensureStepCodeUnique(Number(existing.workflowId), nextStepCode, stepId))) {
      set.status = 409;
      return err("Step code already exists for this workflow");
    }

    const [updated] = await db
      .update(workflowSteps)
      .set({
        ...(parsed.data.stepCode !== undefined ? { stepCode: nextStepCode } : {}),
        ...(parsed.data.stepName !== undefined ? { stepName: parsed.data.stepName } : {}),
        ...(parsed.data.stepOrder !== undefined ? { stepOrder: parsed.data.stepOrder } : {}),
        ...(parsed.data.isTerminal !== undefined ? { isTerminal: parsed.data.isTerminal } : {}),
      })
      .where(eq(workflowSteps.id, stepId))
      .returning();

    return ok(updated);
  })
  .delete("/workflow-steps/:stepId", async ({ params, set }: any) => {
    const stepId = Number(params.stepId);
    const [existing] = await db.select().from(workflowSteps).where(eq(workflowSteps.id, stepId)).limit(1);
    if (!existing) {
      set.status = 404;
      return err("Workflow step not found");
    }

    const [currentStepRefs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mitItems)
      .where(eq(mitItems.currentStepId, stepId));

    const [assignmentRefs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mitStepAssignments)
      .where(eq(mitStepAssignments.stepId, stepId));

    const [handoffFromRefs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mitHandoffs)
      .where(eq(mitHandoffs.fromStepId, stepId));

    const [handoffToRefs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mitHandoffs)
      .where(eq(mitHandoffs.toStepId, stepId));

    const [acceptanceRefs] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(mitAcceptanceLogs)
      .where(eq(mitAcceptanceLogs.stepId, stepId));

    if ([currentStepRefs, assignmentRefs, handoffFromRefs, handoffToRefs, acceptanceRefs].some((row) => (row?.count ?? 0) > 0)) {
      set.status = 409;
      return err("Cannot delete workflow step while it is referenced");
    }

    await db.delete(workflowSteps).where(eq(workflowSteps.id, stepId));
    return ok({ deleted: true });
  })
  .post("/workflows/:id/reorder-steps", async ({ params, body, set }: any) => {
    const workflowId = Number(params.id);
    const parsed = ReorderWorkflowStepsSchema.safeParse(body);
    if (!parsed.success) {
      set.status = 400;
      return err("Invalid reorder payload", parsed.error.flatten());
    }

    const existingSteps = await getWorkflowSteps(workflowId);
    const existingIds = new Set(existingSteps.map((step) => step.id));
    if (parsed.data.steps.some((step) => !existingIds.has(step.id))) {
      set.status = 400;
      return err("One or more steps do not belong to this workflow");
    }

    const seenOrders = new Set<number>();
    for (const step of parsed.data.steps) {
      if (seenOrders.has(step.stepOrder)) {
        set.status = 400;
        return err("Duplicate step order values are not allowed");
      }
      seenOrders.add(step.stepOrder);
    }

    await db.transaction(async (tx) => {
      for (const step of parsed.data.steps) {
        await tx
          .update(workflowSteps)
          .set({ stepOrder: step.stepOrder })
          .where(and(eq(workflowSteps.id, step.id), eq(workflowSteps.workflowId, workflowId)));
      }
    });

    return ok({ reordered: true });
  });

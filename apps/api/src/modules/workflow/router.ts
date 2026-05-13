import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { workflowDefinitions, workflowSteps } from "@rm/db";
import { eq } from "drizzle-orm";
import { ok } from "../../lib/response";
import { authenticate } from "../../lib/auth";

export const workflowRouter = new Elysia({ prefix: "/workflow-steps" })
  .use(authenticate)
  .get("/", async () => {
    const [defaultWorkflow] = await db
      .select({ id: workflowDefinitions.id })
      .from(workflowDefinitions)
      .where(eq(workflowDefinitions.isDefault, true))
      .limit(1);

    const stepQuery = db
      .select({
        id: workflowSteps.id,
        workflowId: workflowSteps.workflowId,
        stepCode: workflowSteps.stepCode,
        stepName: workflowSteps.stepName,
        stepOrder: workflowSteps.stepOrder,
        isTerminal: workflowSteps.isTerminal,
      })
      .from(workflowSteps)
      .orderBy(workflowSteps.stepOrder);

    const steps = defaultWorkflow
      ? await stepQuery.where(eq(workflowSteps.workflowId, defaultWorkflow.id))
      : await stepQuery;

    return ok(steps);
  });

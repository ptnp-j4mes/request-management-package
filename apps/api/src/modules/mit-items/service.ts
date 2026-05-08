import { db } from "../../lib/db";
import {
  mitItems, mitStepAssignments, mitHandoffs,
  mitAcceptanceLogs, mitStatusHistory, workflowSteps,
} from "@rm/db";
import { eq, and } from "drizzle-orm";

export async function assignMitItem(mitId: number, stepId: number, userId: number, role: string, assignedBy: number) {
  const now = new Date();

  const [step] = await db.select().from(workflowSteps).where(eq(workflowSteps.id, stepId));
  if (!step) throw new Error("Workflow step not found");

  const [assignment] = await db.insert(mitStepAssignments).values({
    mitItemId: mitId,
    stepId,
    assignedUserId: userId,
    assignedRole: role,
    assignmentStatus: "assigned",
  }).returning();

  await db.update(mitItems).set({
    currentOwnerUserId: userId,
    currentStepId: stepId,
    currentStepCode: step.stepCode,
    currentStatus: "assigned",
    updatedAt: now,
  }).where(eq(mitItems.id, mitId));

  await db.insert(mitStatusHistory).values({
    mitItemId: mitId,
    oldStatus: "new",
    newStatus: "assigned",
    changedBy: assignedBy,
    remark: `Assigned to step ${step.stepCode}`,
  });

  return assignment;
}

export async function acceptMitItem(mitId: number, userId: number, action: "accept" | "reject" | "return", note?: string) {
  const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
  if (!mit) throw new Error("MIT item not found");

  await db.insert(mitAcceptanceLogs).values({
    mitItemId: mitId,
    stepId: mit.currentStepId,
    userId,
    action,
    note: note ?? null,
  });

  if (action === "accept") {
    await db.update(mitItems).set({ currentStatus: "accepted", updatedAt: new Date() }).where(eq(mitItems.id, mitId));
    await db.update(mitStepAssignments)
      .set({ assignmentStatus: "accepted", acceptedAt: new Date() })
      .where(and(eq(mitStepAssignments.mitItemId, mitId), eq(mitStepAssignments.assignedUserId, userId)));
    await db.insert(mitStatusHistory).values({ mitItemId: mitId, oldStatus: mit.currentStatus, newStatus: "accepted", changedBy: userId });
  } else if (action === "reject") {
    await db.update(mitItems).set({ currentStatus: "assigned", updatedAt: new Date() }).where(eq(mitItems.id, mitId));
    await db.update(mitStepAssignments)
      .set({ assignmentStatus: "assigned" })
      .where(and(eq(mitStepAssignments.mitItemId, mitId), eq(mitStepAssignments.assignedUserId, userId)));
    await db.insert(mitStatusHistory).values({ mitItemId: mitId, oldStatus: mit.currentStatus, newStatus: "assigned", changedBy: userId, remark: note ?? "Rejected" });
  }
}

export async function submitMitItem(mitId: number, fromUserId: number, toUserId: number, toStepId: number, note?: string) {
  const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
  if (!mit) throw new Error("MIT item not found");

  const [toStep] = await db.select().from(workflowSteps).where(eq(workflowSteps.id, toStepId));
  if (!toStep) throw new Error("Target workflow step not found");

  const oldStatus = mit.currentStatus;

  // Complete current step assignment
  await db.update(mitStepAssignments)
    .set({ assignmentStatus: "completed", completedAt: new Date() })
    .where(and(eq(mitStepAssignments.mitItemId, mitId), eq(mitStepAssignments.assignedUserId, fromUserId)));

  // Log completed milestones
  if (mit.currentStepCode === "QA" && !mit.qaCompletedAt) {
    await db.update(mitItems).set({ qaCompletedAt: new Date() }).where(eq(mitItems.id, mitId));
  }
  if (mit.currentStepCode === "UAT" && !mit.uatCompletedAt) {
    await db.update(mitItems).set({ uatCompletedAt: new Date() }).where(eq(mitItems.id, mitId));
  }

  // Create handoff record
  const [handoff] = await db.insert(mitHandoffs).values({
    mitItemId: mitId,
    fromStepId: mit.currentStepId,
    toStepId,
    fromUserId,
    toUserId,
    handoffStatus: "pending_accept",
    note: note ?? null,
  }).returning();

  // Determine new status based on target step
  // MA (terminal) means entering maintenance — not yet deployed
  // deployed is a separate explicit action after release
  const waitingStatus = toStep.stepCode === "QA" ? "waiting_test"
    : toStep.stepCode === "UAT" ? "waiting_uat"
    : toStep.isTerminal ? "in_ma"
    : "assigned";

  // Update snapshot on mit_items
  await db.update(mitItems).set({
    currentOwnerUserId: toUserId,
    currentStepId: toStepId,
    currentStepCode: toStep.stepCode,
    currentStatus: waitingStatus,
    updatedAt: new Date(),
  }).where(eq(mitItems.id, mitId));

  // Create assignment for next step
  await db.insert(mitStepAssignments).values({
    mitItemId: mitId,
    stepId: toStepId,
    assignedUserId: toUserId,
    assignedRole: toStep.stepCode.toLowerCase(),
    assignmentStatus: "assigned",
  });

  await db.insert(mitStatusHistory).values({ mitItemId: mitId, oldStatus, newStatus: waitingStatus, changedBy: fromUserId, remark: note });

  return handoff;
}

export async function returnMitItem(mitId: number, fromUserId: number, toStepId: number, toUserId: number, note: string) {
  const [mit] = await db.select().from(mitItems).where(eq(mitItems.id, mitId));
  if (!mit) throw new Error("MIT item not found");

  const [toStep] = await db.select().from(workflowSteps).where(eq(workflowSteps.id, toStepId));
  if (!toStep) throw new Error("Target workflow step not found");

  const [handoff] = await db.insert(mitHandoffs).values({
    mitItemId: mitId,
    fromStepId: mit.currentStepId,
    toStepId,
    fromUserId,
    toUserId,
    handoffStatus: "returned",
    note,
  }).returning();

  await db.insert(mitAcceptanceLogs).values({
    mitItemId: mitId,
    stepId: mit.currentStepId,
    userId: fromUserId,
    action: "return",
    note,
  });

  await db.update(mitItems).set({
    currentOwnerUserId: toUserId,
    currentStepId: toStepId,
    currentStepCode: toStep.stepCode,
    currentStatus: "assigned",
    updatedAt: new Date(),
  }).where(eq(mitItems.id, mitId));

  await db.insert(mitStepAssignments).values({
    mitItemId: mitId,
    stepId: toStepId,
    assignedUserId: toUserId,
    assignedRole: toStep.stepCode.toLowerCase(),
    assignmentStatus: "assigned",
  });

  await db.insert(mitStatusHistory).values({
    mitItemId: mitId,
    oldStatus: mit.currentStatus,
    newStatus: "assigned",
    changedBy: fromUserId,
    remark: `Returned: ${note}`,
  });

  return handoff;
}

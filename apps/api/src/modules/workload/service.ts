import { db } from "../../lib/db";
import { mitItems, mitHandoffs, users, projects, workflowSteps } from "@rm/db";
import { eq, and, inArray, lt, notInArray, isNotNull, sql } from "drizzle-orm";

const ON_HAND_STATUSES = ["assigned", "accepted", "in_progress", "testing", "uat_in_progress"];
const WAITING_TEST_STATUSES = ["assigned", "waiting_test", "accepted", "testing"];
const WAITING_UAT_STATUSES = ["assigned", "waiting_uat", "accepted", "uat_in_progress"];
const DONE_STATUSES = ["done", "closed", "cancelled", "deployed"];

export async function getWorkloadByUser() {
  const allUsers = await db.select().from(users).where(eq(users.isActive, true));
  const allMit = await db.select().from(mitItems);

  return allUsers.map((u) => {
    const mine = allMit.filter((m) => m.currentOwnerUserId === u.id);
    return {
      userId: u.id,
      fullName: u.fullName,
      roleName: u.roleName,
      onHand: mine.filter((m) => ON_HAND_STATUSES.includes(m.currentStatus ?? "")).length,
      waitingTest: mine.filter((m) => m.currentStepCode === "QA" && WAITING_TEST_STATUSES.includes(m.currentStatus ?? "")).length,
      waitingUat: mine.filter((m) => m.currentStepCode === "UAT" && WAITING_UAT_STATUSES.includes(m.currentStatus ?? "")).length,
      deployed: mine.filter((m) => m.currentStatus === "deployed").length,
    };
  });
}

export async function getWorkloadByProject() {
  const allProjects = await db.select().from(projects);
  const allMit = await db.select().from(mitItems);

  return allProjects.map((p) => {
    const mine = allMit.filter((m) => m.projectId === p.id);
    return {
      projectId: p.id,
      projectCode: p.projectCode,
      projectName: p.projectName,
      onHand: mine.filter((m) => ON_HAND_STATUSES.includes(m.currentStatus ?? "")).length,
      waitingTest: mine.filter((m) => m.currentStepCode === "QA" && WAITING_TEST_STATUSES.includes(m.currentStatus ?? "")).length,
      waitingUat: mine.filter((m) => m.currentStepCode === "UAT" && WAITING_UAT_STATUSES.includes(m.currentStatus ?? "")).length,
      deployed: mine.filter((m) => m.currentStatus === "deployed").length,
      total: mine.length,
    };
  });
}

export async function getOverdueItems() {
  const today = new Date().toISOString().slice(0, 10);
  const data = await db
    .select({
      id: mitItems.id,
      mitNo: mitItems.mitNo,
      title: mitItems.title,
      projectId: mitItems.projectId,
      plannedEndDate: mitItems.plannedEndDate,
      currentStatus: mitItems.currentStatus,
      currentOwnerUserId: mitItems.currentOwnerUserId,
      currentStepCode: mitItems.currentStepCode,
    })
    .from(mitItems)
    .where(
      and(
        isNotNull(mitItems.plannedEndDate),
        notInArray(mitItems.currentStatus, DONE_STATUSES),
        sql`${mitItems.plannedEndDate} < ${today}`
      )
    );
  return data;
}

export async function getPendingHandoffs() {
  const data = await db
    .select({
      id: mitHandoffs.id,
      mitItemId: mitHandoffs.mitItemId,
      fromUserId: mitHandoffs.fromUserId,
      toUserId: mitHandoffs.toUserId,
      fromStepId: mitHandoffs.fromStepId,
      toStepId: mitHandoffs.toStepId,
      handoffStatus: mitHandoffs.handoffStatus,
      note: mitHandoffs.note,
      handedOffAt: mitHandoffs.handedOffAt,
    })
    .from(mitHandoffs)
    .where(eq(mitHandoffs.handoffStatus, "pending_accept"))
    .orderBy(mitHandoffs.handedOffAt);
  return data;
}

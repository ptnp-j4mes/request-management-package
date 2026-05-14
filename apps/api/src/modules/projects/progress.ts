import { db } from "../../lib/db";
import {
  requests,
  mitItems,
  projectTasks,
  uatCycles,
  uatTestResults,
  uatCycleComments,
} from "@rm/db";
import { and, eq } from "drizzle-orm";

function groupCount<T extends Record<string, any>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

export async function buildProjectProgressSummary(projectId: number) {
  const requestRows = await db
    .select({ status: requests.status })
    .from(requests)
    .where(eq(requests.projectId, projectId));

  const mitRows = await db
    .select({
      status: mitItems.status,
      currentStatus: mitItems.currentStatus,
      currentStepCode: mitItems.currentStepCode,
      deployedAt: mitItems.deployedAt,
    })
    .from(mitItems)
    .where(eq(mitItems.projectId, projectId));

  const taskRows = await db
    .select({
      status: projectTasks.status,
      assignedUserId: projectTasks.assignedUserId,
      moduleName: projectTasks.moduleName,
      featureName: projectTasks.featureName,
    })
    .from(projectTasks)
    .where(eq(projectTasks.projectId, projectId));

  const cycles = await db
    .select({ id: uatCycles.id, status: uatCycles.status })
    .from(uatCycles)
    .where(eq(uatCycles.projectId, projectId));

  const cycleIds = cycles.map((c) => c.id);
  const results = cycleIds.length > 0
    ? await db
        .select({ resultStatus: uatTestResults.resultStatus })
        .from(uatTestResults)
        .innerJoin(uatCycles, eq(uatCycles.id, uatTestResults.uatCycleId))
        .where(eq(uatCycles.projectId, projectId))
    : [];

  const defects = cycleIds.length > 0
    ? await db
        .select({
          status: uatCycleComments.status,
          commentType: uatCycleComments.commentType,
          severity: uatCycleComments.severity,
        })
        .from(uatCycleComments)
        .innerJoin(uatCycles, eq(uatCycles.id, uatCycleComments.uatCycleId))
        .where(and(eq(uatCycles.projectId, projectId), eq(uatCycleComments.commentType, "defect")))
    : [];

  const requestSummaryByStatus = groupCount(requestRows, "status");
  const mitSummaryByStatus = groupCount(mitRows, "currentStatus");
  const mitSummaryByStep = groupCount(mitRows, "currentStepCode");

  const taskSummaryByAssignee = taskRows.reduce<Record<string, number>>((acc, row) => {
    const key = row.assignedUserId ? String(row.assignedUserId) : "unassigned";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const taskSummaryByModule = groupCount(taskRows, "moduleName");
  const taskSummaryByFeature = groupCount(taskRows, "featureName");

  const openDefects = defects.filter((d) => ["open", "in_progress"].includes(String(d.status))).length;
  const resolvedDefects = defects.filter((d) => ["resolved", "closed"].includes(String(d.status))).length;
  const criticalHighDefects = defects.filter((d) => ["critical", "high"].includes(String(d.severity))).length;
  const passCount = results.filter((r) => r.resultStatus === "pass").length;
  const failCount = results.filter((r) => r.resultStatus === "fail").length;
  const blockedCount = results.filter((r) => r.resultStatus === "blocked").length;

  return {
    requestSummary: {
      total: requestRows.length,
      byStatus: requestSummaryByStatus,
    },
    mitSummary: {
      total: mitRows.length,
      byStatus: mitSummaryByStatus,
      byStep: mitSummaryByStep,
      completed: mitRows.filter((m) => ["done", "deployed", "closed"].includes(String(m.currentStatus))).length,
      deployed: mitRows.filter((m) => m.deployedAt).length,
    },
    taskSummary: {
      total: taskRows.length,
      done: taskRows.filter((t) => t.status === "done").length,
      blocked: taskRows.filter((t) => t.status === "blocked").length,
      byAssignee: taskSummaryByAssignee,
      byModule: taskSummaryByModule,
      byFeature: taskSummaryByFeature,
    },
    uatSummary: {
      cycles: cycles.length,
      openDefects,
      resolvedDefects,
      criticalHighDefects,
      passCount,
      failCount,
      blockedCount,
    },
  };
}

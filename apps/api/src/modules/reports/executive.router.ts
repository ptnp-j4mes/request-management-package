import { Elysia } from "elysia";
import { and, count, eq, inArray } from "drizzle-orm";
import { db } from "../../lib/db";
import { authenticate, authorize } from "../../lib/auth";
import { ok } from "../../lib/response";
import { buildProjectProgressSummary } from "../projects/progress";
import { projects, requests } from "@rm/db";

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildHealthSummary(project: { status: string }, summary: any) {
  const mitTotal = Number(summary?.mitSummary?.total ?? 0);
  const mitCompleted = Number(summary?.mitSummary?.completed ?? 0);
  const taskTotal = Number(summary?.taskSummary?.total ?? 0);
  const taskDone = Number(summary?.taskSummary?.done ?? 0);
  const uatTotal = Number(summary?.uatSummary?.passCount ?? 0) + Number(summary?.uatSummary?.failCount ?? 0) + Number(summary?.uatSummary?.blockedCount ?? 0);
  const uatPass = Number(summary?.uatSummary?.passCount ?? 0);
  const openDefects = Number(summary?.uatSummary?.openDefects ?? 0);
  const blockedTasks = Number(summary?.taskSummary?.blocked ?? 0);

  const mitProgress = mitTotal > 0 ? mitCompleted / mitTotal : 1;
  const taskProgress = taskTotal > 0 ? taskDone / taskTotal : 1;
  const uatProgress = uatTotal > 0 ? uatPass / uatTotal : 1;
  const progressPercent = clampScore(((mitProgress + taskProgress + uatProgress) / 3) * 100);

  let score = progressPercent;
  if (openDefects > 0) score -= Math.min(30, openDefects * 8);
  if (blockedTasks > 0) score -= Math.min(20, blockedTasks * 10);
  if (project.status === "on_hold") score -= 15;
  if (project.status === "cancelled") score -= 30;

  const reasons: string[] = [];
  if (openDefects > 0) reasons.push(`${openDefects} open defect${openDefects === 1 ? "" : "s"}`);
  if (blockedTasks > 0) reasons.push(`${blockedTasks} blocked task${blockedTasks === 1 ? "" : "s"}`);
  if (project.status === "on_hold") reasons.push("Project is on hold");
  if (project.status === "cancelled") reasons.push("Project is cancelled");
  if (reasons.length === 0) reasons.push("No major blockers detected");

  const status = score >= 80 ? "green" : score >= 55 ? "yellow" : "red";

  return {
    score: clampScore(score),
    status,
    reasons,
    progressPercent,
    openDefects,
    blockedTasks,
  };
}

export const executiveReportsRouter = new Elysia({ prefix: "/reports/executive" })
  .use(authenticate)
  .use(authorize(["ADMIN", "IT_MANAGER", "BA", "FULLSTACK"]))
  .get("/portfolio", async () => {
    const projectRows = await db.select().from(projects).orderBy(projects.projectCode);
    const submittedRequests = await db
      .select({ total: count() })
      .from(requests)
      .where(eq(requests.status, "submitted"));

    const projectsWithHealth = await Promise.all(
      projectRows.map(async (project) => {
        const summary = await buildProjectProgressSummary(project.id);
        const health = buildHealthSummary(project, summary);

        return {
          projectId: project.id,
          projectCode: project.projectCode,
          projectName: project.projectName,
          status: project.status,
          healthStatus: health.status,
          healthScore: health.score,
          progressPercent: health.progressPercent,
          openDefects: health.openDefects,
          blockedTasks: health.blockedTasks,
          goLiveDate: project.goLiveDate,
        };
      }),
    );

    return ok({
      cards: {
        totalProjects: projectRows.length,
        activeProjects: projectRows.filter((project) => project.status === "active").length,
        onHoldProjects: projectRows.filter((project) => project.status === "on_hold").length,
        completedProjects: projectRows.filter((project) => project.status === "completed").length,
        openUatDefects: projectsWithHealth.reduce((sum, project) => sum + project.openDefects, 0),
        blockedWork: projectsWithHealth.reduce((sum, project) => sum + project.blockedTasks, 0),
        pendingApprovals: submittedRequests[0]?.total ?? 0,
      },
      health: {
        green: projectsWithHealth.filter((project) => project.healthStatus === "green").length,
        yellow: projectsWithHealth.filter((project) => project.healthStatus === "yellow").length,
        red: projectsWithHealth.filter((project) => project.healthStatus === "red").length,
      },
      projectsAtRisk: projectsWithHealth.filter((project) => project.healthStatus === "red" || project.openDefects > 0 || project.blockedTasks > 0),
      projects: projectsWithHealth,
    });
  });

import { Elysia } from "elysia";
import dayjs from "dayjs";
import { db } from "../../lib/db";
import { projects, projectMembers, users, mitItems, projectStatusHistory, requests } from "@rm/db";
import { ok, err } from "../../lib/response";
import { eq, and, count, desc } from "drizzle-orm";
import { authenticate, authorize } from "../../lib/auth";
import { buildProjectProgressSummary } from "./progress";

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

function buildWorkspaceSummary(summary: any) {
  const mitTotal = Number(summary?.mitSummary?.total ?? 0);
  const mitCompleted = Number(summary?.mitSummary?.completed ?? 0);
  const mitDeployed = Number(summary?.mitSummary?.deployed ?? 0);

  const taskTotal = Number(summary?.taskSummary?.total ?? 0);
  const taskDone = Number(summary?.taskSummary?.done ?? 0);
  const taskBlocked = Number(summary?.taskSummary?.blocked ?? 0);

  const passCount = Number(summary?.uatSummary?.passCount ?? 0);
  const failCount = Number(summary?.uatSummary?.failCount ?? 0);
  const blockedCount = Number(summary?.uatSummary?.blockedCount ?? 0);
  const uatTotal = passCount + failCount + blockedCount;

  const mitProgress = mitTotal > 0 ? mitCompleted / mitTotal : 1;
  const taskProgress = taskTotal > 0 ? taskDone / taskTotal : 1;
  const uatProgress = uatTotal > 0 ? passCount / uatTotal : 1;
  const progressPercent = clampScore(((mitProgress + taskProgress + uatProgress) / 3) * 100);

  const openDefects = Number(summary?.uatSummary?.openDefects ?? 0);
  const criticalHighDefects = Number(summary?.uatSummary?.criticalHighDefects ?? 0);
  const goLiveReadiness =
    progressPercent >= 80 && openDefects === 0 && taskBlocked === 0 ? "ready" : "not_ready";

  const upcomingMilestone =
    taskBlocked > 0
      ? { name: `${taskBlocked} blocked task${taskBlocked === 1 ? "" : "s"}` }
      : openDefects > 0
        ? { name: `${openDefects} open defect${openDefects === 1 ? "" : "s"}` }
        : summary?.requestSummary?.total > 0
          ? { name: `${summary.requestSummary.total} linked request${summary.requestSummary.total === 1 ? "" : "s"}` }
          : null;

  return {
    progressPercent,
    requestCount: Number(summary?.requestSummary?.total ?? 0),
    mit: {
      total: mitTotal,
      completed: mitCompleted,
      deployed: mitDeployed,
    },
    tasks: {
      total: taskTotal,
      completed: taskDone,
      blocked: taskBlocked,
    },
    uat: {
      pass: passCount,
      fail: failCount,
      blocked: blockedCount,
      passRate: uatTotal > 0 ? clampScore((passCount / uatTotal) * 100) : null,
    },
    openDefects,
    criticalHighDefects,
    goLiveReadiness,
    upcomingMilestone,
  };
}

function normalizeProjectName(body: any) {
  const raw = body?.projectName ?? body?.project_name ?? body?.name ?? body?.title ?? body?.subject;
  const projectName = String(raw ?? "").trim();
  return projectName.length > 0 ? projectName : null;
}

function parseOptionalDate(value: unknown) {
  if (!value) return null;
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.format("YYYY-MM-DD") : null;
}

export const projectsRouter = new Elysia({ prefix: "/projects" })
  .use(authenticate)
  .get("/", async () => {
    const data = await db.select().from(projects).orderBy(projects.projectCode);
    return ok(data);
  })
  .get("/:id", async ({ params }) => {
    const [project] = await db.select().from(projects).where(eq(projects.id, Number(params.id)));
    if (!project) return err("Project not found");

    const members = await db
      .select({ userId: projectMembers.userId, memberRole: projectMembers.memberRole, fullName: users.fullName, email: users.email })
      .from(projectMembers)
      .leftJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, project.id));

    // MD summary
    const mits = await db
      .select({ id: mitItems.id, mitNo: mitItems.mitNo, title: mitItems.title, estimatedMd: mitItems.estimatedMd })
      .from(mitItems)
      .where(eq(mitItems.projectId, project.id));

    const allocatedMd = mits.reduce((sum, m) => sum + Number(m.estimatedMd ?? 0), 0);
    const projectMd = Number(project.estimatedMd ?? 0);

    const mdSummary = {
      estimatedMd: projectMd,
      allocatedMd: Number(allocatedMd.toFixed(2)),
      remainingMd: Number((projectMd - allocatedMd).toFixed(2)),
      items: mits.map((m) => ({
        mitNo: m.mitNo,
        title: m.title,
        estimatedMd: Number(m.estimatedMd ?? 0),
        percent: projectMd > 0
          ? Number(((Number(m.estimatedMd ?? 0) / projectMd) * 100).toFixed(1))
          : 0,
      })),
    };

    const progressSummary = await buildProjectProgressSummary(project.id);
    return ok({ ...project, members, mdSummary, progressSummary });
  })
  .get("/:id/progress-summary", async ({ params }) => {
    const [project] = await db.select().from(projects).where(eq(projects.id, Number(params.id)));
    if (!project) return err("Project not found");
    const summary = await buildProjectProgressSummary(project.id);
    return ok({
      project: {
        id: project.id,
        projectCode: project.projectCode,
        projectName: project.projectName,
        customerName: project.customerName,
        status: project.status,
        goLiveDate: project.goLiveDate,
      },
      ...buildWorkspaceSummary(summary),
      raw: summary,
    });
  })
  .get("/:id/requests", async ({ params }) => {
    const projectId = Number(params.id);
    const [project] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId));
    if (!project) return err("Project not found");

    const rows = await db
      .select()
      .from(requests)
      .where(eq(requests.projectId, projectId))
      .orderBy(desc(requests.createdAt));

    return ok(rows);
  })
  .get("/:id/health", async ({ params }) => {
    const projectId = Number(params.id);
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return err("Project not found");

    const summary = await buildProjectProgressSummary(project.id);
    return ok(buildHealthSummary(project, summary));
  })
  .use(authorize(["ADMIN", "IT_MANAGER"]))
  .post("/", async ({ body, set }: any) => {
    const now = new Date();
    const year = now.getFullYear();
    const [{ total }] = await db.select({ total: count() }).from(projects);
    const projectCode = `AIT-${year}${String(Number(total) + 1).padStart(4, "0")}`;

    const projectName = normalizeProjectName(body);
    if (!projectName) {
      set.status = 400;
      return err("projectName is required");
    }

    const [created] = await db.insert(projects)
      .values({
        projectCode,
        projectName,
        customerName: body?.customerName ? String(body.customerName).trim() : null,
        startDate: parseOptionalDate(body?.startDate),
        goLiveDate: parseOptionalDate(body?.goLiveDate),
        estimatedMd: body?.estimatedMd ?? null,
      })
      .returning();
    return ok(created);
  })
  .patch("/:id", async ({ params, body }: any) => {
    const nextData: Record<string, unknown> = { ...(body as any), updatedAt: new Date() };
    if ("startDate" in nextData) nextData.startDate = parseOptionalDate(nextData.startDate);
    if ("goLiveDate" in nextData) nextData.goLiveDate = parseOptionalDate(nextData.goLiveDate);
    const [updated] = await db.update(projects).set(nextData)
      .where(eq(projects.id, Number(params.id))).returning();
    if (!updated) return err("Project not found");
    return ok(updated);
  })
  .patch("/:id/status", async ({ params, body, user, set }: any) => {
    if (!user.roles?.some((role: string) => ["ADMIN", "IT_MANAGER"].includes(role))) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const [existing] = await db.select().from(projects).where(eq(projects.id, Number(params.id)));
    if (!existing) return err("Project not found");
    const nextStatus = body?.status;
    if (!nextStatus) return err("status is required");
    const [updated] = await db.update(projects).set({ status: nextStatus, updatedAt: new Date() }).where(eq(projects.id, existing.id)).returning();
    await db.insert(projectStatusHistory).values({
      projectId: existing.id,
      oldStatus: existing.status,
      newStatus: nextStatus,
      changedBy: user.id,
      note: body?.note ?? null,
    });
    return ok(updated);
  })
  .post("/:id/members", async ({ params, body }: any) => {
    const [member] = await db.insert(projectMembers).values({
      projectId: Number(params.id),
      userId: body.userId,
      memberRole: body.memberRole,
    }).returning();
    return ok(member);
  })
  .delete("/:id/members/:userId", async ({ params }) => {
    await db.delete(projectMembers)
      .where(and(
        eq(projectMembers.projectId, Number(params.id)),
        eq(projectMembers.userId, Number(params.userId)),
      ));
    return ok({ deleted: true });
  });

import { Elysia } from "elysia";
import dayjs from "dayjs";
import { db } from "../../lib/db";
import { projectTasks } from "@rm/db";
import { ok, err } from "../../lib/response";
import { and, asc, desc, eq } from "drizzle-orm";
import { authenticate } from "../../lib/auth";

const INTERNAL_ROLES = ["ADMIN", "IT_MANAGER", "BA", "FULLSTACK"];

function canManage(user: any) {
  return user?.roles?.some((role: string) => INTERNAL_ROLES.includes(role));
}

function buildTaskSummary(rows: any[]) {
  const byAssignee = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.assignedUserId ? String(row.assignedUserId) : "unassigned";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const byModule = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.moduleName || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const byFeature = rows.reduce<Record<string, number>>((acc, row) => {
    const key = row.featureName || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const done = rows.filter((row) => row.status === "done").length;
  const blocked = rows.filter((row) => row.status === "blocked").length;

  return {
    total: rows.length,
    done,
    blocked,
    percent: rows.length > 0 ? Math.round((done / rows.length) * 100) : 0,
    byAssignee,
    byModule,
    byFeature,
  };
}

export const projectTasksRouter = new Elysia()
  .use(authenticate)
  .get("/projects/:id/tasks", async ({ params, query }: any) => {
    const projectId = Number(params.id);
    const conditions: any[] = [eq(projectTasks.projectId, projectId)];
    if (query.status) conditions.push(eq(projectTasks.status, query.status));
    if (query.assignedUserId) conditions.push(eq(projectTasks.assignedUserId, Number(query.assignedUserId)));
    if (query.moduleName) conditions.push(eq(projectTasks.moduleName, query.moduleName));
    if (query.featureName) conditions.push(eq(projectTasks.featureName, query.featureName));
    if (query.mitItemId) conditions.push(eq(projectTasks.mitItemId, Number(query.mitItemId)));

    const rows = await db.select().from(projectTasks).where(and(...conditions)).orderBy(asc(projectTasks.sortOrder), desc(projectTasks.createdAt));
    return ok({ items: rows, summary: buildTaskSummary(rows) });
  })
  .get("/project-tasks/:id", async ({ params }: any) => {
    const [task] = await db.select().from(projectTasks).where(eq(projectTasks.id, Number(params.id)));
    if (!task) return err("Project task not found");
    return ok(task);
  })
  .post("/projects/:id/tasks", async ({ params, body, user, set }: any) => {
    if (!canManage(user)) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const title = String(body?.title ?? "").trim();
    if (!title) return err("title is required");
    const [created] = await db.insert(projectTasks).values({
      projectId: Number(params.id),
      requestId: body.requestId ?? null,
      mitItemId: body.mitItemId ?? null,
      parentTaskId: body.parentTaskId ?? null,
      title,
      description: body.description ?? null,
      featureName: body.featureName ?? null,
      moduleName: body.moduleName ?? null,
      taskType: body.taskType ?? "other",
      status: body.status ?? "todo",
      priority: body.priority ?? null,
      assignedUserId: body.assignedUserId ?? null,
      createdByUserId: user.id,
      dueDate: body.dueDate ? (dayjs(String(body.dueDate)).isValid() ? dayjs(String(body.dueDate)).toDate() : null) : null,
      sortOrder: Number(body.sortOrder ?? 0),
    }).returning();
    return ok(created);
  })
  .patch("/project-tasks/:id", async ({ params, body, user, set }: any) => {
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, Number(params.id)));
    if (!existing) return err("Project task not found");
    if (!canManage(user) && existing.assignedUserId !== user.id) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const updateData: Record<string, any> = { updatedAt: new Date() };
    for (const key of ["title", "description", "featureName", "moduleName", "taskType", "status", "priority", "assignedUserId", "requestId", "mitItemId", "parentTaskId", "sortOrder"]) {
      if (body[key] !== undefined) updateData[key] = body[key];
    }
    if (body.dueDate !== undefined) updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.status === "done") updateData.completedAt = new Date();
    if (body.status === "todo") updateData.completedAt = null;
    const [updated] = await db.update(projectTasks).set(updateData).where(eq(projectTasks.id, Number(params.id))).returning();
    return ok(updated);
  })
  .delete("/project-tasks/:id", async ({ params, user, set }: any) => {
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, Number(params.id)));
    if (!existing) return err("Project task not found");
    if (!canManage(user)) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const [updated] = await db.update(projectTasks).set({ status: "cancelled", updatedAt: new Date() }).where(eq(projectTasks.id, Number(params.id))).returning();
    return ok(updated);
  })
  .post("/project-tasks/bulk-reorder", async ({ body, user, set }: any) => {
    if (!canManage(user)) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    for (const task of tasks) {
      if (!task?.id) continue;
      await db.update(projectTasks).set({ sortOrder: Number(task.sortOrder ?? 0), updatedAt: new Date() }).where(eq(projectTasks.id, Number(task.id)));
    }
    return ok({ reordered: tasks.length });
  })
  .post("/project-tasks/:id/complete", async ({ params, user, set }: any) => {
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, Number(params.id)));
    if (!existing) return err("Project task not found");
    if (!canManage(user) && existing.assignedUserId !== user.id) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const [updated] = await db.update(projectTasks).set({ status: "done", completedAt: new Date(), updatedAt: new Date() }).where(eq(projectTasks.id, Number(params.id))).returning();
    return ok(updated);
  })
  .post("/project-tasks/:id/reopen", async ({ params, user, set }: any) => {
    const [existing] = await db.select().from(projectTasks).where(eq(projectTasks.id, Number(params.id)));
    if (!existing) return err("Project task not found");
    if (!canManage(user) && existing.assignedUserId !== user.id) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const [updated] = await db.update(projectTasks).set({ status: "in_progress", completedAt: null, updatedAt: new Date() }).where(eq(projectTasks.id, Number(params.id))).returning();
    return ok(updated);
  })
  .post("/project-tasks/:id/link-mit", async ({ params, body, user, set }: any) => {
    if (!canManage(user)) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const [updated] = await db.update(projectTasks).set({ mitItemId: Number(body.mitItemId), updatedAt: new Date() }).where(eq(projectTasks.id, Number(params.id))).returning();
    return ok(updated);
  })
  .delete("/project-tasks/:id/link-mit", async ({ params, user, set }: any) => {
    if (!canManage(user)) {
      set.status = 403;
      return err("Insufficient permissions");
    }
    const [updated] = await db.update(projectTasks).set({ mitItemId: null, updatedAt: new Date() }).where(eq(projectTasks.id, Number(params.id))).returning();
    return ok(updated);
  });

import { Elysia } from "elysia";
import { db } from "../../lib/db";
import { userPerformanceMonthly, users, projects } from "@rm/db";
import { ok } from "../../lib/response";
import { eq, desc } from "drizzle-orm";

export const performanceRouter = new Elysia({ prefix: "/performance" })
  .get("/monthly", async ({ query }: any) => {
    const data = await db
      .select({
        id: userPerformanceMonthly.id,
        userId: userPerformanceMonthly.userId,
        projectId: userPerformanceMonthly.projectId,
        yearNo: userPerformanceMonthly.yearNo,
        monthNo: userPerformanceMonthly.monthNo,
        assignedCount: userPerformanceMonthly.assignedCount,
        completedCount: userPerformanceMonthly.completedCount,
        overdueCount: userPerformanceMonthly.overdueCount,
        avgResolutionHours: userPerformanceMonthly.avgResolutionHours,
        totalActualHours: userPerformanceMonthly.totalActualHours,
        fullName: users.fullName,
        projectCode: projects.projectCode,
      })
      .from(userPerformanceMonthly)
      .leftJoin(users, eq(users.id, userPerformanceMonthly.userId))
      .leftJoin(projects, eq(projects.id, userPerformanceMonthly.projectId))
      .orderBy(desc(userPerformanceMonthly.yearNo), desc(userPerformanceMonthly.monthNo));
    return ok(data);
  });

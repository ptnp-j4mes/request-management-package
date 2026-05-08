import { pgTable, bigserial, integer, numeric, timestamp, bigint, unique } from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";

export const userPerformanceMonthly = pgTable("user_performance_monthly", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id),
  projectId: bigint("project_id", { mode: "number" }).references(() => projects.id),
  yearNo: integer("year_no").notNull(),
  monthNo: integer("month_no").notNull(),
  assignedCount: integer("assigned_count").notNull().default(0),
  completedCount: integer("completed_count").notNull().default(0),
  overdueCount: integer("overdue_count").notNull().default(0),
  avgResolutionHours: numeric("avg_resolution_hours", { precision: 10, scale: 2 }),
  totalActualHours: numeric("total_actual_hours", { precision: 12, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  unq: unique().on(t.userId, t.projectId, t.yearNo, t.monthNo),
}));

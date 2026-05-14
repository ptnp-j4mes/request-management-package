import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { requests } from "./requests";
import { mitItems } from "./mit";
import { users } from "./users";

export const projectTasks = pgTable("project_tasks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  requestId: bigint("request_id", { mode: "number" }).references(() => requests.id, { onDelete: "set null" }),
  mitItemId: bigint("mit_item_id", { mode: "number" }).references(() => mitItems.id, { onDelete: "set null" }),
  parentTaskId: bigint("parent_task_id", { mode: "number" }).references(() => projectTasks.id, { onDelete: "set null" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  featureName: varchar("feature_name", { length: 120 }),
  moduleName: varchar("module_name", { length: 120 }),
  taskType: varchar("task_type", { length: 30 }).notNull().default("other"),
  status: varchar("status", { length: 30 }).notNull().default("todo"),
  priority: varchar("priority", { length: 20 }),
  assignedUserId: bigint("assigned_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  createdByUserId: bigint("created_by_user_id", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
  dueDate: timestamp("due_date", { withTimezone: true }),
  sortOrder: integer("sort_order").notNull().default(0),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index("idx_project_tasks_project_id").on(t.projectId),
  mitIdx: index("idx_project_tasks_mit_item_id").on(t.mitItemId),
  assigneeIdx: index("idx_project_tasks_assigned_user_id").on(t.assignedUserId),
  statusIdx: index("idx_project_tasks_status").on(t.status),
  moduleIdx: index("idx_project_tasks_module_name").on(t.moduleName),
  featureIdx: index("idx_project_tasks_feature_name").on(t.featureName),
}));

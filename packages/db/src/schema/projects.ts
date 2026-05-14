import { pgTable, bigserial, varchar, date, timestamp, bigint, primaryKey, numeric, text } from "drizzle-orm/pg-core";
import { users } from "./users";

export const projects = pgTable("projects", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectCode: varchar("project_code", { length: 50 }).notNull().unique(),
  projectName: varchar("project_name", { length: 255 }).notNull(),
  customerName: varchar("customer_name", { length: 255 }),
  startDate: date("start_date"),
  goLiveDate: date("go_live_date"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  estimatedMd: numeric("estimated_md", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" }).notNull().references(() => users.id, { onDelete: "cascade" }),
    memberRole: varchar("member_role", { length: 100 }).notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.userId] }),
  })
);

export const projectStatusHistory = pgTable("project_status_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id, { onDelete: "cascade" }),
  oldStatus: varchar("old_status", { length: 30 }),
  newStatus: varchar("new_status", { length: 30 }).notNull(),
  changedBy: bigint("changed_by", { mode: "number" }).references(() => users.id),
  note: text("note"),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
});

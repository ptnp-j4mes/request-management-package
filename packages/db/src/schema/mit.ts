import {
  pgTable, bigserial, varchar, text, numeric, date, timestamp, bigint, index, integer
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";
import { requests } from "./requests";
import { workflowSteps } from "./workflow";

export const mitItems = pgTable("mit_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  mitNo: varchar("mit_no", { length: 50 }).notNull().unique(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id),
  requestId: bigint("request_id", { mode: "number" }).references(() => requests.id),
  parentMitId: bigint("parent_mit_id", { mode: "number" }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  itemType: varchar("item_type", { length: 30 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  moduleName: varchar("module_name", { length: 100 }),
  priority: varchar("priority", { length: 20 }),
  severity: varchar("severity", { length: 20 }),
  status: varchar("status", { length: 30 }).notNull().default("new"),
  // snapshot fields for fast workload reporting
  currentOwnerUserId: bigint("current_owner_user_id", { mode: "number" }).references(() => users.id),
  currentStepId: bigint("current_step_id", { mode: "number" }).references(() => workflowSteps.id),
  currentStepCode: varchar("current_step_code", { length: 20 }),
  currentStatus: varchar("current_status", { length: 30 }).notNull().default("new"),
  qaCompletedAt: timestamp("qa_completed_at", { withTimezone: true }),
  uatCompletedAt: timestamp("uat_completed_at", { withTimezone: true }),
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  plannedStartDate: date("planned_start_date"),
  plannedEndDate: date("planned_end_date"),
  actualStartAt: timestamp("actual_start_at", { withTimezone: true }),
  actualEndAt: timestamp("actual_end_at", { withTimezone: true }),
  estimatedHours: numeric("estimated_hours", { precision: 10, scale: 2 }),
  actualHours: numeric("actual_hours", { precision: 10, scale: 2 }),
  estimatedMd: numeric("estimated_md", { precision: 10, scale: 2 }),
  githubBranchName: varchar("github_branch_name", { length: 255 }),
  githubPrUrl: varchar("github_pr_url", { length: 500 }),
  githubPrNumber: integer("github_pr_number"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  projectIdx: index("idx_mit_items_project_id").on(t.projectId),
  requestIdx: index("idx_mit_items_request_id").on(t.requestId),
  statusIdx: index("idx_mit_items_status").on(t.status),
  ownerIdx: index("idx_mit_items_owner").on(t.currentOwnerUserId),
  stepCodeIdx: index("idx_mit_items_step_code").on(t.currentStepCode),
}));

export const mitStepAssignments = pgTable("mit_step_assignments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  mitItemId: bigint("mit_item_id", { mode: "number" }).notNull().references(() => mitItems.id, { onDelete: "cascade" }),
  stepId: bigint("step_id", { mode: "number" }).notNull().references(() => workflowSteps.id),
  assignedUserId: bigint("assigned_user_id", { mode: "number" }).notNull().references(() => users.id),
  assignedRole: varchar("assigned_role", { length: 50 }).notNull(),
  assignmentStatus: varchar("assignment_status", { length: 30 }).notNull().default("assigned"),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (t) => ({
  itemIdx: index("idx_mit_step_assignments_item").on(t.mitItemId),
  userIdx: index("idx_mit_step_assignments_user").on(t.assignedUserId),
}));

export const mitHandoffs = pgTable("mit_handoffs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  mitItemId: bigint("mit_item_id", { mode: "number" }).notNull().references(() => mitItems.id, { onDelete: "cascade" }),
  fromStepId: bigint("from_step_id", { mode: "number" }).references(() => workflowSteps.id),
  toStepId: bigint("to_step_id", { mode: "number" }).references(() => workflowSteps.id),
  fromUserId: bigint("from_user_id", { mode: "number" }).references(() => users.id),
  toUserId: bigint("to_user_id", { mode: "number" }).references(() => users.id),
  handoffStatus: varchar("handoff_status", { length: 30 }).notNull().default("pending_accept"),
  note: text("note"),
  handedOffAt: timestamp("handed_off_at", { withTimezone: true }).notNull().defaultNow(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (t) => ({
  itemIdx: index("idx_mit_handoffs_item").on(t.mitItemId),
}));

export const mitAcceptanceLogs = pgTable("mit_acceptance_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  mitItemId: bigint("mit_item_id", { mode: "number" }).notNull().references(() => mitItems.id, { onDelete: "cascade" }),
  stepId: bigint("step_id", { mode: "number" }).references(() => workflowSteps.id),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id),
  action: varchar("action", { length: 20 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const mitStatusHistory = pgTable("mit_status_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  mitItemId: bigint("mit_item_id", { mode: "number" }).notNull().references(() => mitItems.id, { onDelete: "cascade" }),
  oldStatus: varchar("old_status", { length: 30 }),
  newStatus: varchar("new_status", { length: 30 }).notNull(),
  changedBy: bigint("changed_by", { mode: "number" }).references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  remark: text("remark"),
});

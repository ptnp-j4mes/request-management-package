import {
  pgTable, bigserial, varchar, text, boolean, timestamp, bigint
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";
import { uatCycles } from "./uat";
import { maintenanceAgreements } from "./maintenance";

export const requests = pgTable("requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestNo: varchar("request_no", { length: 50 }).notNull().unique(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id),
  requesterUserId: bigint("requester_user_id", { mode: "number" }).references(() => users.id),
  assignedUserId: bigint("assigned_user_id", { mode: "number" }).references(() => users.id),
  channel: varchar("channel", { length: 30 }).notNull(),
  requestType: varchar("request_type", { length: 30 }).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description").notNull(),
  sourceModule: varchar("source_module", { length: 100 }),
  businessImpact: varchar("business_impact", { length: 20 }),
  urgency: varchar("urgency", { length: 20 }),
  priority: varchar("priority", { length: 20 }),
  status: varchar("status", { length: 30 }).notNull().default("new"),
  triageResult: varchar("triage_result", { length: 30 }),
  assignedTeam: varchar("assigned_team", { length: 50 }),
  uatCycleId: bigint("uat_cycle_id", { mode: "number" }).references(() => uatCycles.id),
  maId: bigint("ma_id", { mode: "number" }).references(() => maintenanceAgreements.id),
  parentRequestId: bigint("parent_request_id", { mode: "number" }),
  duplicateOfRequestId: bigint("duplicate_of_request_id", { mode: "number" }),
  firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
  resolutionDueAt: timestamp("resolution_due_at", { withTimezone: true }),
  breachedFlag: boolean("breached_flag").notNull().default(false),
  openedAt: timestamp("opened_at", { withTimezone: true }).notNull().defaultNow(),
  dueAt: timestamp("due_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const requestComments = pgTable("request_comments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: bigint("request_id", { mode: "number" }).notNull().references(() => requests.id, { onDelete: "cascade" }),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  commentType: varchar("comment_type", { length: 20 }).notNull().default("comment"),
  commentText: text("comment_text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const requestStatusHistory = pgTable("request_status_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: bigint("request_id", { mode: "number" }).notNull().references(() => requests.id, { onDelete: "cascade" }),
  oldStatus: varchar("old_status", { length: 30 }),
  newStatus: varchar("new_status", { length: 30 }).notNull(),
  changedBy: bigint("changed_by", { mode: "number" }).references(() => users.id),
  changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  remark: text("remark"),
});

export const requestBugs = pgTable("request_bugs", {
  requestId: bigint("request_id", { mode: "number" }).primaryKey().references(() => requests.id, { onDelete: "cascade" }),
  severity: varchar("severity", { length: 20 }).notNull(),
  rootCause: text("root_cause"),
  workaround: text("workaround"),
  fixVersion: varchar("fix_version", { length: 50 }),
  retestResult: varchar("retest_result", { length: 20 }),
});

export const requestChanges = pgTable("request_changes", {
  requestId: bigint("request_id", { mode: "number" }).primaryKey().references(() => requests.id, { onDelete: "cascade" }),
  changeCategory: varchar("change_category", { length: 50 }),
  benefitSummary: text("benefit_summary"),
  impactSummary: text("impact_summary"),
  estimateNote: text("estimate_note"),
  approvedFlag: boolean("approved_flag").notNull().default(false),
  approvedBy: bigint("approved_by", { mode: "number" }).references(() => users.id),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export const requestAttachments = pgTable("request_attachments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: bigint("request_id", { mode: "number" }).notNull().references(() => requests.id, { onDelete: "cascade" }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  filePath: text("file_path").notNull(),
  uploadedBy: bigint("uploaded_by", { mode: "number" }).references(() => users.id),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
});

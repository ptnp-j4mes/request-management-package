import { pgTable, bigserial, varchar, date, text, boolean, timestamp, bigint } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";
import { requests } from "./requests";

export const uatCycles = pgTable("uat_cycles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id),
  cycleName: varchar("cycle_name", { length: 100 }).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status", { length: 30 }).notNull().default("planned"),
  objective: text("objective"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uatTestCases = pgTable("uat_test_cases", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id),
  testCaseCode: varchar("test_case_code", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  moduleName: varchar("module_name", { length: 100 }),
  expectedResult: text("expected_result"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  activeFlag: boolean("active_flag").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uatTestResults = pgTable("uat_test_results", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  uatCycleId: bigint("uat_cycle_id", { mode: "number" }).notNull().references(() => uatCycles.id, { onDelete: "cascade" }),
  testCaseId: bigint("test_case_id", { mode: "number" }).notNull().references(() => uatTestCases.id),
  testerUserId: bigint("tester_user_id", { mode: "number" }).references(() => users.id),
  testDate: timestamp("test_date", { withTimezone: true }),
  resultStatus: varchar("result_status", { length: 20 }).notNull(),
  actualResult: text("actual_result"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const uatCycleComments = pgTable("uat_cycle_comments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  uatCycleId: bigint("uat_cycle_id", { mode: "number" })
    .notNull().references(() => uatCycles.id, { onDelete: "cascade" }),
  testCaseId: bigint("test_case_id", { mode: "number" })
    .references(() => uatTestCases.id, { onDelete: "set null" }),
  createdByUserId: bigint("created_by_user_id", { mode: "number" })
    .references(() => users.id),
  commentText: text("comment_text").notNull(),
  commentType: varchar("comment_type", { length: 50 }).notNull().default("comment"),
  // "comment" | "defect" | "question" | "note"
  severity: varchar("severity", { length: 50 }),
  // null | "critical" | "high" | "medium" | "low"
  status: varchar("status", { length: 50 }).notNull().default("open"),
  // "open" | "in_progress" | "resolved" | "closed"
  linkedRequestId: bigint("linked_request_id", { mode: "number" })
    .references(() => requests.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

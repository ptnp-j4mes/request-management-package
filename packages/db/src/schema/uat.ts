import { pgTable, bigserial, varchar, date, text, boolean, timestamp, bigint } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

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

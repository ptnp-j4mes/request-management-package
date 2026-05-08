import { pgTable, bigserial, varchar, date, text, timestamp, bigint } from "drizzle-orm/pg-core";
import { projects } from "./projects";

export const maintenanceAgreements = pgTable("maintenance_agreements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).notNull().references(() => projects.id),
  maType: varchar("ma_type", { length: 50 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  supportScope: text("support_scope"),
  supportSla: text("support_sla"),
  status: varchar("status", { length: 30 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

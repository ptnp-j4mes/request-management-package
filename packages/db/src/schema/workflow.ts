import { pgTable, bigserial, varchar, integer, boolean, text, timestamp, bigint } from "drizzle-orm/pg-core";

export const workflowDefinitions = pgTable("workflow_definitions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workflowSteps = pgTable("workflow_steps", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  workflowId: bigint("workflow_id", { mode: "number" }).notNull().references(() => workflowDefinitions.id, { onDelete: "cascade" }),
  stepCode: varchar("step_code", { length: 20 }).notNull(),
  stepName: varchar("step_name", { length: 100 }).notNull(),
  stepOrder: integer("step_order").notNull(),
  isTerminal: boolean("is_terminal").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

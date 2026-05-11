import { pgTable, bigserial, bigint, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { departments } from "./departments";

export const users = pgTable("users", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  roleName: varchar("role_name", { length: 100 }),
  companyName: varchar("company_name", { length: 255 }),
  departmentId: bigint("department_id", { mode: "number" }).references(() => departments.id, { onDelete: "set null" }),
  githubUsername: varchar("github_username", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

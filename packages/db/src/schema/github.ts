import { pgTable, bigserial, bigint, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const projectGithubSettings = pgTable("project_github_settings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  repoOwner: varchar("repo_owner", { length: 100 }).notNull(),
  repoName: varchar("repo_name", { length: 200 }).notNull(),
  defaultBranch: varchar("default_branch", { length: 100 }).notNull().default("main"),
  accessToken: text("access_token"),
  connectedByUserId: bigint("connected_by_user_id", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

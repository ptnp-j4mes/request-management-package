-- Migration 0009: Request intake / project execution boundary refactor

ALTER TABLE "requests"
  ALTER COLUMN "project_id" DROP NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'draft';

CREATE TABLE IF NOT EXISTS "project_status_history" (
  "id" bigserial PRIMARY KEY,
  "project_id" bigint NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "old_status" varchar(30),
  "new_status" varchar(30) NOT NULL,
  "changed_by" bigint REFERENCES "users"("id") ON DELETE NO ACTION,
  "note" text,
  "changed_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "project_tasks" (
  "id" bigserial PRIMARY KEY,
  "project_id" bigint NOT NULL REFERENCES "projects"("id") ON DELETE CASCADE,
  "request_id" bigint REFERENCES "requests"("id") ON DELETE SET NULL,
  "mit_item_id" bigint REFERENCES "mit_items"("id") ON DELETE SET NULL,
  "parent_task_id" bigint REFERENCES "project_tasks"("id") ON DELETE SET NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "feature_name" varchar(120),
  "module_name" varchar(120),
  "task_type" varchar(30) NOT NULL DEFAULT 'other',
  "status" varchar(30) NOT NULL DEFAULT 'todo',
  "priority" varchar(20),
  "assigned_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
  "created_by_user_id" bigint REFERENCES "users"("id") ON DELETE SET NULL,
  "due_date" timestamptz,
  "sort_order" integer NOT NULL DEFAULT 0,
  "completed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT NOW(),
  "updated_at" timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_project_tasks_project_id" ON "project_tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_mit_item_id" ON "project_tasks" ("mit_item_id");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_assigned_user_id" ON "project_tasks" ("assigned_user_id");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_status" ON "project_tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_module_name" ON "project_tasks" ("module_name");
CREATE INDEX IF NOT EXISTS "idx_project_tasks_feature_name" ON "project_tasks" ("feature_name");

ALTER TABLE "uat_cycle_comments"
  ADD COLUMN IF NOT EXISTS "linked_mit_item_id" bigint,
  ADD COLUMN IF NOT EXISTS "linked_project_task_id" bigint;

ALTER TABLE "uat_cycle_comments"
  ADD CONSTRAINT "uat_cycle_comments_linked_mit_item_id_mit_items_id_fk"
    FOREIGN KEY ("linked_mit_item_id") REFERENCES "mit_items"("id") ON DELETE SET NULL;

ALTER TABLE "uat_cycle_comments"
  ADD CONSTRAINT "uat_cycle_comments_linked_project_task_id_project_tasks_id_fk"
    FOREIGN KEY ("linked_project_task_id") REFERENCES "project_tasks"("id") ON DELETE SET NULL;

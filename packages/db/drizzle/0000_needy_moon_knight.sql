CREATE TABLE IF NOT EXISTS "users" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"role_name" varchar(100),
	"company_name" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_members" (
	"project_id" bigint NOT NULL,
	"user_id" bigint NOT NULL,
	"member_role" varchar(100) NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_members_project_id_user_id_pk" PRIMARY KEY("project_id","user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_code" varchar(50) NOT NULL,
	"project_name" varchar(255) NOT NULL,
	"customer_name" varchar(255),
	"start_date" date,
	"go_live_date" date,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_project_code_unique" UNIQUE("project_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maintenance_agreements" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"ma_type" varchar(50) NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"support_scope" text,
	"support_sla" text,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uat_cycles" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"cycle_name" varchar(100) NOT NULL,
	"start_date" date,
	"end_date" date,
	"status" varchar(30) DEFAULT 'planned' NOT NULL,
	"objective" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uat_test_cases" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint NOT NULL,
	"test_case_code" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"module_name" varchar(100),
	"expected_result" text,
	"priority" varchar(20) DEFAULT 'medium',
	"active_flag" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "uat_test_results" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"uat_cycle_id" bigint NOT NULL,
	"test_case_id" bigint NOT NULL,
	"tester_user_id" bigint,
	"test_date" timestamp with time zone,
	"result_status" varchar(20) NOT NULL,
	"actual_result" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_attachments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" bigint NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"uploaded_by" bigint,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_bugs" (
	"request_id" bigint PRIMARY KEY NOT NULL,
	"severity" varchar(20) NOT NULL,
	"root_cause" text,
	"workaround" text,
	"fix_version" varchar(50),
	"retest_result" varchar(20)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_changes" (
	"request_id" bigint PRIMARY KEY NOT NULL,
	"change_category" varchar(50),
	"benefit_summary" text,
	"impact_summary" text,
	"estimate_note" text,
	"approved_flag" boolean DEFAULT false NOT NULL,
	"approved_by" bigint,
	"approved_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_comments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" bigint NOT NULL,
	"created_by" bigint,
	"comment_type" varchar(20) DEFAULT 'comment' NOT NULL,
	"comment_text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "request_status_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" bigint NOT NULL,
	"old_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by" bigint,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_no" varchar(50) NOT NULL,
	"project_id" bigint NOT NULL,
	"requester_user_id" bigint,
	"assigned_user_id" bigint,
	"channel" varchar(30) NOT NULL,
	"request_type" varchar(30) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"source_module" varchar(100),
	"business_impact" varchar(20),
	"urgency" varchar(20),
	"priority" varchar(20),
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"triage_result" varchar(30),
	"assigned_team" varchar(50),
	"uat_cycle_id" bigint,
	"ma_id" bigint,
	"parent_request_id" bigint,
	"duplicate_of_request_id" bigint,
	"first_response_at" timestamp with time zone,
	"resolution_due_at" timestamp with time zone,
	"breached_flag" boolean DEFAULT false NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"due_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "requests_request_no_unique" UNIQUE("request_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_definitions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "workflow_steps" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"workflow_id" bigint NOT NULL,
	"step_code" varchar(20) NOT NULL,
	"step_name" varchar(100) NOT NULL,
	"step_order" integer NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mit_acceptance_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mit_item_id" bigint NOT NULL,
	"step_id" bigint,
	"user_id" bigint,
	"action" varchar(20) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mit_handoffs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mit_item_id" bigint NOT NULL,
	"from_step_id" bigint,
	"to_step_id" bigint,
	"from_user_id" bigint,
	"to_user_id" bigint,
	"handoff_status" varchar(30) DEFAULT 'pending_accept' NOT NULL,
	"note" text,
	"handed_off_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mit_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mit_no" varchar(50) NOT NULL,
	"project_id" bigint NOT NULL,
	"request_id" bigint,
	"parent_mit_id" bigint,
	"created_by" bigint,
	"item_type" varchar(30) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"module_name" varchar(100),
	"priority" varchar(20),
	"severity" varchar(20),
	"status" varchar(30) DEFAULT 'new' NOT NULL,
	"current_owner_user_id" bigint,
	"current_step_id" bigint,
	"current_step_code" varchar(20),
	"current_status" varchar(30) DEFAULT 'new' NOT NULL,
	"qa_completed_at" timestamp with time zone,
	"uat_completed_at" timestamp with time zone,
	"deployed_at" timestamp with time zone,
	"planned_start_date" date,
	"planned_end_date" date,
	"actual_start_at" timestamp with time zone,
	"actual_end_at" timestamp with time zone,
	"estimated_hours" numeric(10, 2),
	"actual_hours" numeric(10, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mit_items_mit_no_unique" UNIQUE("mit_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mit_status_history" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mit_item_id" bigint NOT NULL,
	"old_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by" bigint,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"remark" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mit_step_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"mit_item_id" bigint NOT NULL,
	"step_id" bigint NOT NULL,
	"assigned_user_id" bigint NOT NULL,
	"assigned_role" varchar(50) NOT NULL,
	"assignment_status" varchar(30) DEFAULT 'assigned' NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_channels" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"channel_code" varchar(50) NOT NULL,
	"channel_name" varchar(100) NOT NULL,
	CONSTRAINT "bot_channels_channel_code_unique" UNIQUE("channel_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_messages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"message_type" varchar(20) NOT NULL,
	"message_text" text NOT NULL,
	"sync_status" varchar(20) DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_requests" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_id" bigint NOT NULL,
	"request_id" bigint,
	"request_no" varchar(50) NOT NULL,
	"request_mode" varchar(20) NOT NULL,
	"request_payload" jsonb NOT NULL,
	"request_status" varchar(20) DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	CONSTRAINT "bot_requests_request_no_unique" UNIQUE("request_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"request_id" bigint NOT NULL,
	"response_payload" jsonb,
	"response_text" text,
	"response_status" varchar(20) DEFAULT 'success' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bot_sessions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"project_id" bigint,
	"user_id" bigint,
	"channel_id" bigint,
	"session_key" varchar(100) NOT NULL,
	"is_offline" boolean DEFAULT false NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "bot_sessions_session_key_unique" UNIQUE("session_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_performance_monthly" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" bigint NOT NULL,
	"project_id" bigint,
	"year_no" integer NOT NULL,
	"month_no" integer NOT NULL,
	"assigned_count" integer DEFAULT 0 NOT NULL,
	"completed_count" integer DEFAULT 0 NOT NULL,
	"overdue_count" integer DEFAULT 0 NOT NULL,
	"avg_resolution_hours" numeric(10, 2),
	"total_actual_hours" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_performance_monthly_user_id_project_id_year_no_month_no_unique" UNIQUE("user_id","project_id","year_no","month_no")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "maintenance_agreements" ADD CONSTRAINT "maintenance_agreements_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uat_cycles" ADD CONSTRAINT "uat_cycles_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uat_test_cases" ADD CONSTRAINT "uat_test_cases_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uat_test_results" ADD CONSTRAINT "uat_test_results_uat_cycle_id_uat_cycles_id_fk" FOREIGN KEY ("uat_cycle_id") REFERENCES "public"."uat_cycles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uat_test_results" ADD CONSTRAINT "uat_test_results_test_case_id_uat_test_cases_id_fk" FOREIGN KEY ("test_case_id") REFERENCES "public"."uat_test_cases"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "uat_test_results" ADD CONSTRAINT "uat_test_results_tester_user_id_users_id_fk" FOREIGN KEY ("tester_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_attachments" ADD CONSTRAINT "request_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_bugs" ADD CONSTRAINT "request_bugs_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_changes" ADD CONSTRAINT "request_changes_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_changes" ADD CONSTRAINT "request_changes_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_comments" ADD CONSTRAINT "request_comments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "request_status_history" ADD CONSTRAINT "request_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requests" ADD CONSTRAINT "requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requests" ADD CONSTRAINT "requests_requester_user_id_users_id_fk" FOREIGN KEY ("requester_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requests" ADD CONSTRAINT "requests_uat_cycle_id_uat_cycles_id_fk" FOREIGN KEY ("uat_cycle_id") REFERENCES "public"."uat_cycles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "requests" ADD CONSTRAINT "requests_ma_id_maintenance_agreements_id_fk" FOREIGN KEY ("ma_id") REFERENCES "public"."maintenance_agreements"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflow_definitions_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow_definitions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_acceptance_logs" ADD CONSTRAINT "mit_acceptance_logs_mit_item_id_mit_items_id_fk" FOREIGN KEY ("mit_item_id") REFERENCES "public"."mit_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_acceptance_logs" ADD CONSTRAINT "mit_acceptance_logs_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_acceptance_logs" ADD CONSTRAINT "mit_acceptance_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_handoffs" ADD CONSTRAINT "mit_handoffs_mit_item_id_mit_items_id_fk" FOREIGN KEY ("mit_item_id") REFERENCES "public"."mit_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_handoffs" ADD CONSTRAINT "mit_handoffs_from_step_id_workflow_steps_id_fk" FOREIGN KEY ("from_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_handoffs" ADD CONSTRAINT "mit_handoffs_to_step_id_workflow_steps_id_fk" FOREIGN KEY ("to_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_handoffs" ADD CONSTRAINT "mit_handoffs_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_handoffs" ADD CONSTRAINT "mit_handoffs_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_items" ADD CONSTRAINT "mit_items_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_items" ADD CONSTRAINT "mit_items_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_items" ADD CONSTRAINT "mit_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_items" ADD CONSTRAINT "mit_items_current_owner_user_id_users_id_fk" FOREIGN KEY ("current_owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_items" ADD CONSTRAINT "mit_items_current_step_id_workflow_steps_id_fk" FOREIGN KEY ("current_step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_status_history" ADD CONSTRAINT "mit_status_history_mit_item_id_mit_items_id_fk" FOREIGN KEY ("mit_item_id") REFERENCES "public"."mit_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_status_history" ADD CONSTRAINT "mit_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_step_assignments" ADD CONSTRAINT "mit_step_assignments_mit_item_id_mit_items_id_fk" FOREIGN KEY ("mit_item_id") REFERENCES "public"."mit_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_step_assignments" ADD CONSTRAINT "mit_step_assignments_step_id_workflow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."workflow_steps"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mit_step_assignments" ADD CONSTRAINT "mit_step_assignments_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_messages" ADD CONSTRAINT "bot_messages_session_id_bot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."bot_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_requests" ADD CONSTRAINT "bot_requests_session_id_bot_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."bot_sessions"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_requests" ADD CONSTRAINT "bot_requests_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_responses" ADD CONSTRAINT "bot_responses_request_id_bot_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."bot_requests"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "bot_sessions" ADD CONSTRAINT "bot_sessions_channel_id_bot_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."bot_channels"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_performance_monthly" ADD CONSTRAINT "user_performance_monthly_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_performance_monthly" ADD CONSTRAINT "user_performance_monthly_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_handoffs_item" ON "mit_handoffs" ("mit_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_items_project_id" ON "mit_items" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_items_request_id" ON "mit_items" ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_items_status" ON "mit_items" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_items_owner" ON "mit_items" ("current_owner_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_items_step_code" ON "mit_items" ("current_step_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_step_assignments_item" ON "mit_step_assignments" ("mit_item_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mit_step_assignments_user" ON "mit_step_assignments" ("assigned_user_id");
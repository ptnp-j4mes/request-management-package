import {
  pgTable, bigserial, bigint, varchar, text, boolean, integer,
  timestamp, date, jsonb,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";

export const googleBotAccounts = pgTable("google_bot_accounts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  displayName: varchar("display_name", { length: 255 }),
  accountType: varchar("account_type", { length: 50 }).notNull().default("BOT"),
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),
  calendarId: varchar("calendar_id", { length: 255 }),
  driveFolderId: varchar("drive_folder_id", { length: 255 }),
  authProfilePath: text("auth_profile_path"),
  oauthCredentialRef: text("oauth_credential_ref"),
  maxParallelMeetings: integer("max_parallel_meetings").notNull().default(1),
  currentStatus: varchar("current_status", { length: 50 }).notNull().default("AVAILABLE"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  lastHealthCheckAt: timestamp("last_health_check_at", { withTimezone: true }),
  lastError: text("last_error"),
  createdBy: bigint("created_by", { mode: "number" }).references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleBotAccountSessions = pgTable("google_bot_account_sessions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  googleBotAccountId: bigint("google_bot_account_id", { mode: "number" })
    .notNull()
    .references(() => googleBotAccounts.id, { onDelete: "cascade" }),
  sessionStatus: varchar("session_status", { length: 50 }).notNull().default("UNKNOWN"),
  profilePath: text("profile_path"),
  cookieExpiresAt: timestamp("cookie_expires_at", { withTimezone: true }),
  requiresRelogin: boolean("requires_relogin").notNull().default(false),
  requires2fa: boolean("requires_2fa").notNull().default(false),
  lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
  lastSuccessLoginAt: timestamp("last_success_login_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMeetingSettings = pgTable("project_meeting_settings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => projects.id, { onDelete: "cascade" }),
  meetingBotEnabled: boolean("meeting_bot_enabled").notNull().default(false),
  syncMode: varchar("sync_mode", { length: 50 }).notNull().default("OFF"),
  conflictPolicy: varchar("conflict_policy", { length: 50 }).notNull().default("LATEST_UPDATE_WINS"),
  multipleGoogleAccountsEnabled: boolean("multiple_google_accounts_enabled").notNull().default(false),
  defaultGoogleBotAccountId: bigint("default_google_bot_account_id", { mode: "number" })
    .references(() => googleBotAccounts.id),
  accountSelectionPolicy: varchar("account_selection_policy", { length: 50 }).notNull().default("LEAST_BUSY"),
  fallbackAccountEnabled: boolean("fallback_account_enabled").notNull().default(true),
  botEmail: varchar("bot_email", { length: 255 }),
  autoJoinBeforeMinutes: integer("auto_join_before_minutes").notNull().default(3),
  autoLeaveAfterMinutes: integer("auto_leave_after_minutes").notNull().default(10),
  autoRecord: boolean("auto_record").notNull().default(true),
  autoTranscribe: boolean("auto_transcribe").notNull().default(true),
  autoSummarize: boolean("auto_summarize").notNull().default(true),
  summaryProvider: varchar("summary_provider", { length: 50 }).notNull().default("GEMINI"),
  summaryPattern: varchar("summary_pattern", { length: 100 }).notNull().default("BA_REQUIREMENT"),
  googleCalendarId: varchar("google_calendar_id", { length: 255 }),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }),
  googleMeetUrl: text("google_meet_url"),
  lastProjectSyncAt: timestamp("last_project_sync_at", { withTimezone: true }),
  lastGoogleSyncAt: timestamp("last_google_sync_at", { withTimezone: true }),
  syncStatus: varchar("sync_status", { length: 50 }).notNull().default("IDLE"),
  syncError: text("sync_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectMeetings = pgTable("project_meetings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" })
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  meetingUrl: text("meeting_url"),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }),
  timezone: varchar("timezone", { length: 100 }).default("Asia/Bangkok"),
  googleCalendarId: varchar("google_calendar_id", { length: 255 }),
  googleCalendarEventId: varchar("google_calendar_event_id", { length: 255 }),
  googleEventEtag: varchar("google_event_etag", { length: 255 }),
  googleUpdatedAt: timestamp("google_updated_at", { withTimezone: true }),
  sourceOfTruth: varchar("source_of_truth", { length: 50 }).default("PROJECT"),
  syncStatus: varchar("sync_status", { length: 50 }).default("IDLE"),
  syncError: text("sync_error"),
  googleBotAccountId: bigint("google_bot_account_id", { mode: "number" })
    .references(() => googleBotAccounts.id),
  selectedBotEmail: varchar("selected_bot_email", { length: 255 }),
  accountSelectionReason: text("account_selection_reason"),
  botStatus: varchar("bot_status", { length: 50 }).default("SCHEDULED"),
  recordingStatus: varchar("recording_status", { length: 50 }).default("PENDING"),
  summaryStatus: varchar("summary_status", { length: 50 }).default("PENDING"),
  joinedAt: timestamp("joined_at", { withTimezone: true }),
  leftAt: timestamp("left_at", { withTimezone: true }),
  recordingDriveFileId: varchar("recording_drive_file_id", { length: 255 }),
  recordingFileUrl: text("recording_file_url"),
  transcriptText: text("transcript_text"),
  summaryMarkdown: text("summary_markdown"),
  createdBy: bigint("created_by", { mode: "number" })
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingBotLogs = pgTable("meeting_bot_logs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  meetingId: bigint("meeting_id", { mode: "number" })
    .notNull()
    .references(() => projectMeetings.id, { onDelete: "cascade" }),
  level: varchar("level", { length: 20 }).notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingActionItems = pgTable("meeting_action_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  meetingId: bigint("meeting_id", { mode: "number" })
    .notNull()
    .references(() => projectMeetings.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  ownerName: varchar("owner_name", { length: 255 }),
  ownerUserId: bigint("owner_user_id", { mode: "number" }).references(() => users.id),
  dueDate: date("due_date"),
  status: varchar("status", { length: 50 }).notNull().default("OPEN"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

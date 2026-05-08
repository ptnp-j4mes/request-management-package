import { pgTable, bigserial, varchar, boolean, text, jsonb, timestamp, bigint } from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { users } from "./users";
import { requests } from "./requests";

export const botChannels = pgTable("bot_channels", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  channelCode: varchar("channel_code", { length: 50 }).notNull().unique(),
  channelName: varchar("channel_name", { length: 100 }).notNull(),
});

export const botSessions = pgTable("bot_sessions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).references(() => projects.id),
  userId: bigint("user_id", { mode: "number" }).references(() => users.id),
  channelId: bigint("channel_id", { mode: "number" }).references(() => botChannels.id),
  sessionKey: varchar("session_key", { length: 100 }).notNull().unique(),
  isOffline: boolean("is_offline").notNull().default(false),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const botMessages = pgTable("bot_messages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "number" }).notNull().references(() => botSessions.id, { onDelete: "cascade" }),
  messageType: varchar("message_type", { length: 20 }).notNull(),
  messageText: text("message_text").notNull(),
  syncStatus: varchar("sync_status", { length: 20 }).notNull().default("completed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botRequests = pgTable("bot_requests", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionId: bigint("session_id", { mode: "number" }).notNull().references(() => botSessions.id, { onDelete: "cascade" }),
  requestId: bigint("request_id", { mode: "number" }).references(() => requests.id),
  requestNo: varchar("request_no", { length: 50 }).notNull().unique(),
  requestMode: varchar("request_mode", { length: 20 }).notNull(),
  requestPayload: jsonb("request_payload").notNull(),
  requestStatus: varchar("request_status", { length: 20 }).notNull().default("queued"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

export const botResponses = pgTable("bot_responses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  requestId: bigint("request_id", { mode: "number" }).notNull().references(() => botRequests.id, { onDelete: "cascade" }),
  responsePayload: jsonb("response_payload"),
  responseText: text("response_text"),
  responseStatus: varchar("response_status", { length: 20 }).notNull().default("success"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

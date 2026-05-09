import { z } from "zod";

export const AppRole = z.enum([
  "ADMIN",
  "REQUESTER",
  "APPROVER",
  "BA",
  "DEVELOPER",
  "QA",
  "FULLSTACK",
  "IT_MANAGER",
]);
export type AppRole = z.infer<typeof AppRole>;

export const ProjectStatus = z.enum(["active", "on_hold", "completed", "cancelled"]);
export const RequestType = z.enum(["bug", "feedback", "comment", "support", "user_question", "change_request", "uat_finding", "bot_request"]);
export const RequestStatus = z.enum(["new", "open", "in_progress", "waiting", "resolved", "closed", "rejected"]);
export const RequestChannel = z.enum(["portal", "email", "bot", "manual", "phone"]);
export const Priority = z.enum(["critical", "high", "medium", "low"]);
export const Urgency = z.enum(["immediate", "high", "medium", "low"]);
export const BusinessImpact = z.enum(["critical", "high", "medium", "low"]);
export const Severity = z.enum(["critical", "major", "minor", "trivial"]);

export const WorkflowStepCode = z.enum(["DEV", "QA", "UAT", "MA"]);

export const MitItemType = z.enum(["bug_fix", "change", "feature", "task", "uat_fix"]);
export const MitStatus = z.enum([
  "new", "assigned", "accepted", "in_progress",
  "waiting_test", "testing", "waiting_uat", "uat_in_progress",
  "done", "deployed", "closed", "cancelled",
]);
export const AssignmentStatus = z.enum(["assigned", "accepted", "in_progress", "completed", "rejected"]);
export const HandoffStatus = z.enum(["pending_accept", "accepted", "returned", "cancelled"]);
export const AcceptanceAction = z.enum(["accept", "reject", "return"]);

export const UatCycleStatus = z.enum(["planned", "active", "completed", "cancelled"]);
export const UatResultStatus = z.enum(["pass", "fail", "blocked", "not_executed"]);

export const MaStatus = z.enum(["active", "expired", "terminated"]);
export const MaType = z.enum(["annual", "project", "adhoc"]);

export const BotRequestMode = z.enum(["online", "offline"]);
export const BotRequestStatus = z.enum(["queued", "processing", "completed", "failed"]);
export const BotMessageType = z.enum(["user", "bot", "system"]);
export const SyncStatus = z.enum(["pending", "completed", "failed"]);

export type ProjectStatus = z.infer<typeof ProjectStatus>;
export type RequestType = z.infer<typeof RequestType>;
export type RequestStatus = z.infer<typeof RequestStatus>;
export type RequestChannel = z.infer<typeof RequestChannel>;
export type Priority = z.infer<typeof Priority>;
export type WorkflowStepCode = z.infer<typeof WorkflowStepCode>;
export type MitStatus = z.infer<typeof MitStatus>;
export type HandoffStatus = z.infer<typeof HandoffStatus>;
export type AcceptanceAction = z.infer<typeof AcceptanceAction>;
export type UatResultStatus = z.infer<typeof UatResultStatus>;

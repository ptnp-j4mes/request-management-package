import { z } from "zod";
import {
  RequestType, RequestStatus, RequestChannel, Priority, Urgency, BusinessImpact,
  MitItemType, MitStatus, WorkflowStepCode, HandoffStatus, AcceptanceAction,
  UatResultStatus, MaType, BotMessageType, ProjectTaskType, ProjectTaskStatus,
} from "./enums";

// ── Users ─────────────────────────────────────────────────────────────────────
export const CreateUserSchema = z.object({
  username: z.string().min(2).max(100),
  fullName: z.string().min(2).max(255),
  email: z.string().email().optional(),
  roleName: z.string().optional(),
  companyName: z.string().optional(),
  password: z.string().min(6).optional(),
  departmentId: z.number().int().positive().optional(),
  githubUsername: z.string().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(z.number().int().positive()).optional(),
  roleCodes: z.array(z.string().min(1)).optional(),
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const SetUserRolesSchema = z.object({
  roleIds: z.array(z.number().int().positive()).optional(),
  roleCodes: z.array(z.string().min(1)).optional(),
});

export const CreateRoleSchema = z.object({
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
});

export const UpdateRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
});

export const CreateWorkflowSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const UpdateWorkflowSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const CreateWorkflowStepSchema = z.object({
  stepCode: z.string().min(1).max(20),
  stepName: z.string().min(2).max(100),
  stepOrder: z.number().int().nonnegative(),
  isTerminal: z.boolean().optional(),
});

export const UpdateWorkflowStepSchema = z.object({
  stepCode: z.string().min(1).max(20).optional(),
  stepName: z.string().min(2).max(100).optional(),
  stepOrder: z.number().int().nonnegative().optional(),
  isTerminal: z.boolean().optional(),
});

export const ReorderWorkflowStepsSchema = z.object({
  steps: z.array(
    z.object({
      id: z.number().int().positive(),
      stepOrder: z.number().int().nonnegative(),
    }),
  ).min(1),
});

// ── Projects ──────────────────────────────────────────────────────────────────
export const CreateProjectSchema = z.object({
  projectCode: z.string().min(2).max(50),
  projectName: z.string().min(2).max(255),
  customerName: z.string().optional(),
  startDate: z.string().optional(),
  goLiveDate: z.string().optional(),
});

export const UpdateProjectStatusSchema = z.object({
  status: z.enum(["active", "on_hold", "completed", "cancelled"]),
  note: z.string().optional(),
});

export const AddProjectMemberSchema = z.object({
  userId: z.number().int().positive(),
  memberRole: z.string().min(2).max(100),
});

// ── Maintenance Agreements ────────────────────────────────────────────────────
export const CreateMaSchema = z.object({
  projectId: z.number().int().positive(),
  maType: MaType,
  startDate: z.string(),
  endDate: z.string(),
  supportScope: z.string().optional(),
  supportSla: z.string().optional(),
});

// ── UAT ───────────────────────────────────────────────────────────────────────
export const CreateUatCycleSchema = z.object({
  projectId: z.number().int().positive(),
  cycleName: z.string().min(2).max(100),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  objective: z.string().optional(),
});

export const CreateUatTestCaseSchema = z.object({
  projectId: z.number().int().positive(),
  testCaseCode: z.string().min(2).max(50),
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  moduleName: z.string().optional(),
  expectedResult: z.string().optional(),
  priority: Priority.optional(),
});

export const CreateUatTestResultSchema = z.object({
  uatCycleId: z.number().int().positive(),
  testCaseId: z.number().int().positive(),
  testerUserId: z.number().int().positive().optional(),
  resultStatus: UatResultStatus,
  actualResult: z.string().optional(),
  note: z.string().optional(),
});

// ── Requests ──────────────────────────────────────────────────────────────────
export const CreateRequestSchema = z.object({
  projectId: z.number().int().positive().nullable().optional(),
  requesterUserId: z.number().int().positive().optional(),
  channel: RequestChannel,
  requestType: RequestType,
  subject: z.string().min(2).max(255),
  description: z.string().min(2),
  sourceModule: z.string().optional(),
  businessImpact: BusinessImpact.optional(),
  urgency: Urgency.optional(),
  priority: Priority.optional(),
  uatCycleId: z.number().int().positive().optional(),
  maId: z.number().int().positive().optional(),
});

export const UpdateRequestSchema = CreateRequestSchema.partial().extend({
  status: RequestStatus.optional(),
  triageResult: z.string().optional(),
  assignedUserId: z.number().int().positive().optional(),
  assignedTeam: z.string().optional(),
});

export const LinkRequestToProjectSchema = z.object({
  projectId: z.number().int().positive().nullable(),
  createProject: z.boolean().optional(),
  project: CreateProjectSchema.partial().optional(),
});

export const RequestFilterSchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  requestType: RequestType.optional(),
  status: RequestStatus.optional(),
  priority: Priority.optional(),
  assignedUserId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

// ── MIT Items ─────────────────────────────────────────────────────────────────
export const CreateMitItemSchema = z.object({
  projectId: z.number().int().positive(),
  requestId: z.number().int().positive().optional(),
  itemType: MitItemType,
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  moduleName: z.string().optional(),
  priority: Priority.optional(),
  severity: z.string().optional(),
  plannedStartDate: z.string().optional(),
  plannedEndDate: z.string().optional(),
  estimatedHours: z.number().positive().optional(),
});

export const CreateProjectTaskSchema = z.object({
  projectId: z.number().int().positive(),
  requestId: z.number().int().positive().optional().nullable(),
  mitItemId: z.number().int().positive().optional().nullable(),
  parentTaskId: z.number().int().positive().optional().nullable(),
  title: z.string().min(2).max(255),
  description: z.string().optional(),
  featureName: z.string().optional(),
  moduleName: z.string().optional(),
  taskType: ProjectTaskType.optional(),
  status: ProjectTaskStatus.optional(),
  priority: Priority.optional(),
  assignedUserId: z.number().int().positive().optional().nullable(),
  dueDate: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export const UpdateProjectTaskSchema = CreateProjectTaskSchema.partial();

export const AssignMitSchema = z.object({
  userId: z.number().int().positive(),
  stepId: z.number().int().positive(),
  role: z.string().min(2).max(50).optional(),
});

export const SubmitMitSchema = z.object({
  toUserId: z.number().int().positive(),
  toStepId: z.number().int().positive(),
  note: z.string().optional(),
});

export const ReturnMitSchema = z.object({
  toStepId: z.number().int().positive(),
  toUserId: z.number().int().positive(),
  note: z.string().min(2),
});

export const AcceptMitSchema = z.object({
  action: AcceptanceAction,
  note: z.string().optional(),
});

export const MitFilterSchema = z.object({
  projectId: z.coerce.number().int().positive().optional(),
  currentStepCode: WorkflowStepCode.optional(),
  currentStatus: MitStatus.optional(),
  currentOwnerUserId: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

// ── Bot ───────────────────────────────────────────────────────────────────────
export const CreateBotSessionSchema = z.object({
  projectId: z.number().int().positive().optional(),
  userId: z.number().int().positive().optional(),
  channelId: z.number().int().positive(),
  isOffline: z.boolean().default(false),
});

export const CreateBotMessageSchema = z.object({
  sessionId: z.number().int().positive(),
  messageType: BotMessageType,
  messageText: z.string().min(1),
});

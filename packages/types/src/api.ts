import { z } from "zod";

export const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
  sortBy: z.string().optional(),
  sortDir: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof PaginationQuery>;

export type ApiResponse<T> = {
  success: true;
  data: T;
};

export type ApiError = {
  success: false;
  error: string;
  details?: unknown;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}>;

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  departmentId: number | null;
  roles: string[];
};

export type RoleDto = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  createdAt: string;
};

export type UserRoleDto = {
  id: number;
  code: string;
  name: string;
  description: string | null;
};

export type UserDto = {
  id: number;
  username: string;
  fullName: string;
  email: string | null;
  roleName: string | null;
  companyName: string | null;
  departmentId: number | null;
  githubUsername: string | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type JwtPayload = {
  sub: number;
  email: string;
  departmentId: number | null;
  roles: string[];
  iat?: number;
  exp?: number;
};

export type WorkflowStepDto = {
  id: number;
  workflowId: number;
  stepCode: string;
  stepName: string;
  stepOrder: number;
  isTerminal: boolean;
};

export type WorkflowDefinitionDto = {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: string;
  stepCount: number;
};

export type WorkflowDefinitionDetailDto = WorkflowDefinitionDto & {
  steps: WorkflowStepDto[];
};

export type AssignableMitUserDto = {
  id: number;
  fullName: string;
  email: string | null;
  roleName: string | null;
  roles: string[];
  projectMemberRole: string | null;
  eligibleForStep: true;
  eligibilityReason: "PROJECT_MEMBER" | "ROLE" | "FULLSTACK";
};

export type AssignableMitUsersResponse = ApiResponse<{
  data: AssignableMitUserDto[];
}>;

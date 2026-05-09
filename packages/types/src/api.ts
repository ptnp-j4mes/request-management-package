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

export type LoginResponse = {
  accessToken: string;
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

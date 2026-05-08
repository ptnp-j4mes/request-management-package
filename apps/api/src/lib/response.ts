import type { ApiResponse, ApiError, PaginatedResponse } from "@rm/types";

export function ok<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  return {
    success: true,
    data: { items, total, page, limit, totalPages: Math.ceil(total / limit) },
  };
}

export function err(message: string, details?: unknown): ApiError {
  return { success: false, error: message, details };
}

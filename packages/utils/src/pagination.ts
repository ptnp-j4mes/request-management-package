export function paginate(page: number, limit: number) {
  return {
    offset: (page - 1) * limit,
    limit,
  };
}

export function paginatedResponse<T>(items: T[], total: number, page: number, limit: number) {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

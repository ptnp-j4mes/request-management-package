const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Request failed");
  return json;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// Typed helpers
export const projectsApi = {
  list: () => api.get<any>("/projects"),
  get: (id: number) => api.get<any>(`/projects/${id}`),
  create: (body: any) => api.post<any>("/projects", body),
};

export const requestsApi = {
  list: (params?: Record<string, any>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<any>(`/requests${qs}`);
  },
  get: (id: number) => api.get<any>(`/requests/${id}`),
  create: (body: any) => api.post<any>("/requests", body),
  update: (id: number, body: any) => api.patch<any>(`/requests/${id}`, body),
};

export const mitApi = {
  list: (params?: Record<string, any>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return api.get<any>(`/mit-items${qs}`);
  },
  get: (id: number) => api.get<any>(`/mit-items/${id}`),
  create: (body: any) => api.post<any>("/mit-items", body),
  assign: (id: number, body: any) => api.post<any>(`/mit-items/${id}/assign`, body),
  accept: (id: number, body: any) => api.post<any>(`/mit-items/${id}/accept`, body),
  submit: (id: number, body: any) => api.post<any>(`/mit-items/${id}/submit`, body),
  returnItem: (id: number, body: any) => api.post<any>(`/mit-items/${id}/return`, body),
};

export const workloadApi = {
  byUser: () => api.get<any>("/workload/by-user"),
  byProject: () => api.get<any>("/workload/by-project"),
  overdue: () => api.get<any>("/workload/overdue"),
  pendingHandoffs: () => api.get<any>("/workload/handoffs/pending"),
};

export const uatApi = {
  cycles: () => api.get<any>("/uat/cycles"),
  cycle: (id: number) => api.get<any>(`/uat/cycles/${id}`),
  testCases: () => api.get<any>("/uat/test-cases"),
  results: () => api.get<any>("/uat/test-results"),
};

export const botApi = {
  sessions: () => api.get<any>("/bot/sessions"),
  session: (id: number) => api.get<any>(`/bot/sessions/${id}`),
};

export const performanceApi = {
  monthly: () => api.get<any>("/performance/monthly"),
};

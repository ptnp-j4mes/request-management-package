const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:9898";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("rm_access_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(init?.headers as Record<string, string> | undefined),
    },
    ...init,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      localStorage.removeItem("rm_access_token");
      localStorage.removeItem("rm_user");
      document.cookie = "rm_token=; path=/; max-age=0";
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

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
  // Workflow transitions
  submit:          (id: number) => api.post<any>(`/requests/${id}/submit`, {}),
  approve:         (id: number) => api.post<any>(`/requests/${id}/approve`, {}),
  reject:          (id: number, reason: string) => api.post<any>(`/requests/${id}/reject`, { reason }),
  assignBA:        (id: number, baUserId: number) => api.post<any>(`/requests/${id}/assign-ba`, { baUserId }),
  assignDev:       (id: number, devUserId: number) => api.post<any>(`/requests/${id}/assign-dev`, { devUserId }),
  assignQA:        (id: number, qaUserId: number) => api.post<any>(`/requests/${id}/assign-qa`, { qaUserId }),
  startDevelopment:(id: number) => api.post<any>(`/requests/${id}/start-development`, {}),
  readyForQA:      (id: number) => api.post<any>(`/requests/${id}/ready-for-qa`, {}),
  qaPass:          (id: number) => api.post<any>(`/requests/${id}/qa-pass`, {}),
  qaFail:          (id: number, reason: string) => api.post<any>(`/requests/${id}/qa-fail`, { reason }),
  uatApprove:      (id: number) => api.post<any>(`/requests/${id}/uat-approve`, {}),
  close:           (id: number) => api.post<any>(`/requests/${id}/close`, {}),
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

export const githubApi = {
  getSettings: (projectId: number) =>
    api.get<any>(`/projects/${projectId}/github-settings`),
  updateSettings: (projectId: number, body: { repoOwner: string; repoName: string; defaultBranch?: string }) =>
    request<any>(`/projects/${projectId}/github-settings`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  getProjectCommits: (projectId: number, author?: string) => {
    const qs = author ? `?author=${encodeURIComponent(author)}` : "";
    return api.get<any>(`/projects/${projectId}/commits${qs}`);
  },
  getMitCommits: (mitId: number) =>
    api.get<any>(`/mit-items/${mitId}/commits`),
  connectUrl: (projectId: number) =>
    `${BASE}/auth/github/connect?projectId=${projectId}`,
  connectSystemUrl: () =>
    `${BASE}/auth/github/connect?system=true`,
  // Git operations on MIT items
  createBranch: (mitId: number, branchName?: string) =>
    api.post<any>(`/mit-items/${mitId}/github/create-branch`, branchName ? { branchName } : {}),
  createPr: (mitId: number, title?: string) =>
    api.post<any>(`/mit-items/${mitId}/github/create-pr`, title ? { title } : {}),
  mergePr: (mitId: number) =>
    api.post<any>(`/mit-items/${mitId}/github/merge-pr`, {}),
  deleteBranch: (mitId: number) =>
    request<any>(`/mit-items/${mitId}/github/delete-branch`, { method: "DELETE" }),
  // Create GitHub repo for a project
  createRepo: (projectId: number, body: {
    repoName: string;
    repoOwner?: string;
    isPrivate?: boolean;
    description?: string;
  }) => api.post<any>(`/projects/${projectId}/github/create-repo`, body),
  // System GitHub account
  getSystemAccount: () => api.get<any>("/settings/github-account"),
  updateSystemAccount: (body: { label?: string; githubUsername?: string; accessToken?: string }) =>
    request<any>("/settings/github-account", { method: "PUT", body: JSON.stringify(body) }),
};

export const settingsApi = {
  getMe: () => api.get<any>("/auth/me"),
  updateProfile: (body: { fullName?: string; email?: string; companyName?: string; githubUsername?: string }) =>
    request<any>("/users/me", { method: "PATCH", body: JSON.stringify(body) }),
  // Google Bot Accounts
  listBotAccounts: () => api.get<any>("/google-bot-accounts"),
  createBotAccount: (body: any) => api.post<any>("/google-bot-accounts", body),
  updateBotAccount: (id: number, body: any) =>
    request<any>(`/google-bot-accounts/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  disableBotAccount: (id: number) => api.post<any>(`/google-bot-accounts/${id}/disable`, {}),
  setDefaultBotAccount: (id: number) => api.post<any>(`/google-bot-accounts/${id}/set-default`, {}),
};

export const authApi = {
  login: (email: string, password: string) =>
    request<any>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => api.get<any>("/auth/me"),
  refresh: (refreshToken: string) =>
    request<any>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) }),
  logout: () => api.post<any>("/auth/logout", {}),
};

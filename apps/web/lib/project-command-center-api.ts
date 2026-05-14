import { api } from "./api";

export type ApiEnvelope<T> = { success: boolean; data: T; error?: string };

export const projectCommandCenterApi = {
  progressSummary: (projectId: number) => api.get<ApiEnvelope<any>>(`/projects/${projectId}/progress-summary`),
  health: (projectId: number) => api.get<ApiEnvelope<any>>(`/projects/${projectId}/health`),
  requests: (projectId: number) => api.get<ApiEnvelope<any[]>>(`/projects/${projectId}/requests`),
  tasks: (projectId: number, params?: Record<string, string | number | undefined>) => {
    const qs = params
      ? "?" + new URLSearchParams(Object.entries(params).reduce<Record<string, string>>((acc, [k, v]) => {
          if (v !== undefined && v !== "") acc[k] = String(v);
          return acc;
        }, {})).toString()
      : "";
    return api.get<ApiEnvelope<any>>(`/projects/${projectId}/tasks${qs}`);
  },
  createTask: (projectId: number, body: any) => api.post<ApiEnvelope<any>>(`/projects/${projectId}/tasks`, body),
  completeTask: (taskId: number) => api.post<ApiEnvelope<any>>(`/project-tasks/${taskId}/complete`, {}),
  reopenTask: (taskId: number) => api.post<ApiEnvelope<any>>(`/project-tasks/${taskId}/reopen`, {}),
  updateTask: (taskId: number, body: any) => api.patch<ApiEnvelope<any>>(`/project-tasks/${taskId}`, body),
  deleteTask: (taskId: number) => api.delete<ApiEnvelope<any>>(`/project-tasks/${taskId}`),
  updateStatus: (projectId: number, body: { status: string; note?: string }) => api.patch<ApiEnvelope<any>>(`/projects/${projectId}/status`, body),
  executivePortfolio: () => api.get<ApiEnvelope<any>>(`/reports/executive/portfolio`),
};

export const requestIntakeApi = {
  submit: (id: number) => api.post<ApiEnvelope<any>>(`/requests/${id}/submit`, {}),
  approve: (id: number) => api.post<ApiEnvelope<any>>(`/requests/${id}/approve`, {}),
  reject: (id: number, reason: string) => api.post<ApiEnvelope<any>>(`/requests/${id}/reject`, { reason }),
  linkProject: (id: number, projectId: number) => api.post<ApiEnvelope<any>>(`/requests/${id}/link-project`, { projectId }),
  createProject: (id: number, body: any) => api.post<ApiEnvelope<any>>(`/requests/${id}/create-project`, body),
  close: (id: number) => api.post<ApiEnvelope<any>>(`/requests/${id}/close`, {}),
  addUatFeedback: (id: number, commentText: string) => api.post<ApiEnvelope<any>>(`/requests/${id}/uat-feedback`, { commentText, commentType: "defect" }),
};

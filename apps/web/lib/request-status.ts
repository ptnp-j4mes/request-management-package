export const REQUEST_STATUS_FLOW = [
  "draft",
  "submitted",
  "approved",
  "linked_to_project",
  "in_progress",
  "uat",
  "completed",
  "closed",
  "rejected",
] as const;

const LEGACY_MAP: Record<string, string> = {
  new: "draft",
  open: "submitted",
  waiting: "submitted",
  manager_approved: "approved",
  ba_review: "in_progress",
  waiting_estimate: "in_progress",
  assigned_to_dev: "in_progress",
  in_development: "in_progress",
  ready_for_qa: "in_progress",
  in_qa: "in_progress",
  resolved: "completed",
};

const LABELS: Record<string, string> = {
  draft: "Draft",
  submitted: "Submitted",
  approved: "Approved",
  linked_to_project: "Linked to Project",
  in_progress: "In Progress",
  uat: "UAT",
  completed: "Completed",
  closed: "Closed",
  rejected: "Rejected",
};

export function normalizeRequestStatus(status?: string | null) {
  if (!status) return "draft";
  return LEGACY_MAP[status] ?? status;
}

export function requestStatusLabel(status?: string | null) {
  const normalized = normalizeRequestStatus(status);
  return LABELS[normalized] ?? normalized.replace(/_/g, " ");
}


// Pure permission helpers — no React dependency, usable anywhere

export type PermUser = { id: number; roles: string[] };
export type PermRequest = {
  status: string;
  requesterUserId: number;
  devOwnerId?: number | null;
  qaOwnerId?: number | null;
};

// ── Role groups ────────────────────────────────────────────────────────────────
const MGMT         = ["IT_MANAGER", "ADMIN"] as const;
const APPROVERS    = ["APPROVER", "FULLSTACK", "IT_MANAGER", "ADMIN"] as const;
const DEV_ROLES    = ["DEVELOPER", "FULLSTACK", "IT_MANAGER", "ADMIN"] as const;
const QA_ROLES     = ["QA", "FULLSTACK", "IT_MANAGER", "ADMIN"] as const;
const EDIT_ROLES   = ["APPROVER", "BA", "FULLSTACK", "IT_MANAGER", "ADMIN"] as const;
const REJECT_ROLES = ["APPROVER", "BA", "QA", "FULLSTACK", "IT_MANAGER", "ADMIN"] as const;
const BYPASS_OWN   = ["FULLSTACK", "IT_MANAGER", "ADMIN"] as const;

function hasAny(u: PermUser, roles: readonly string[]): boolean {
  return roles.some((r) => u.roles.includes(r));
}

// ── Request CRUD ──────────────────────────────────────────────────────────────
export const canEdit = (u: PermUser) => hasAny(u, EDIT_ROLES);

// ── Workflow transitions ───────────────────────────────────────────────────────
export const canSubmit = (u: PermUser, r: PermRequest) =>
  r.status === "draft" && (r.requesterUserId === u.id || hasAny(u, MGMT));

export const canApprove = (u: PermUser, r: PermRequest) =>
  r.status === "submitted" && hasAny(u, APPROVERS);

export const canReject = (u: PermUser, r: PermRequest) =>
  ["submitted", "manager_approved", "ba_review", "in_qa"].includes(r.status) &&
  hasAny(u, REJECT_ROLES);

export const canAssignBA = (u: PermUser, r: PermRequest) =>
  ["manager_approved", "ba_review"].includes(r.status) && hasAny(u, MGMT);

export const canAssignDev = (u: PermUser, r: PermRequest) =>
  ["ba_review", "waiting_estimate"].includes(r.status) && hasAny(u, MGMT);

export const canAssignQA = (u: PermUser, r: PermRequest) =>
  ["ready_for_qa", "in_qa"].includes(r.status) && hasAny(u, MGMT);

export const canStartDev = (u: PermUser, r: PermRequest) =>
  r.status === "assigned_to_dev" &&
  hasAny(u, DEV_ROLES) &&
  (hasAny(u, BYPASS_OWN) || r.devOwnerId === u.id);

export const canReadyForQA = (u: PermUser, r: PermRequest) =>
  r.status === "in_development" &&
  hasAny(u, DEV_ROLES) &&
  (hasAny(u, BYPASS_OWN) || r.devOwnerId === u.id);

export const canQAPass = (u: PermUser, r: PermRequest) =>
  r.status === "in_qa" &&
  hasAny(u, QA_ROLES) &&
  (hasAny(u, BYPASS_OWN) || r.qaOwnerId === u.id);

export const canQAFail = (u: PermUser, r: PermRequest) =>
  r.status === "in_qa" &&
  hasAny(u, QA_ROLES) &&
  (hasAny(u, BYPASS_OWN) || r.qaOwnerId === u.id);

export const canUATApprove = (u: PermUser, r: PermRequest) =>
  r.status === "uat" && (r.requesterUserId === u.id || hasAny(u, APPROVERS));

export const canClose = (u: PermUser, _r: PermRequest) => hasAny(u, MGMT);

// ── Sidebar menu visibility ────────────────────────────────────────────────────
export const canViewWorkload    = (u: PermUser) => hasAny(u, ["BA", "FULLSTACK", "IT_MANAGER", "ADMIN"]);
export const canViewPerformance = (u: PermUser) => hasAny(u, ["IT_MANAGER", "ADMIN"]);
export const canViewBotSessions = (u: PermUser) => hasAny(u, ["IT_MANAGER", "ADMIN", "BA", "FULLSTACK"]);
export const canViewAdmin       = (u: PermUser) => hasAny(u, ["ADMIN"]);

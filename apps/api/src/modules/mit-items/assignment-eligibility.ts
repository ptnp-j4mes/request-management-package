import { db } from "../../lib/db";
import {
  mitItems,
  projectMembers,
  roles,
  userRoles,
  users,
  workflowSteps,
} from "@rm/db";
import { eq } from "drizzle-orm";

export type EligibilityReason = "PROJECT_MEMBER" | "ROLE" | "FULLSTACK";

type StepRule = {
  assignedRole: string;
  projectMemberRoles: string[];
  roleCodes: string[];
  roleNameKeywords: string[];
};

const STEP_POSITION_RULES: Record<string, StepRule> = {
  DEV: {
    assignedRole: "developer",
    projectMemberRoles: ["developer", "dev", "fullstack"],
    roleCodes: ["DEVELOPER", "FULLSTACK"],
    roleNameKeywords: ["developer", "fullstack"],
  },
  QA: {
    assignedRole: "qa",
    projectMemberRoles: ["qa", "tester", "fullstack"],
    roleCodes: ["QA", "FULLSTACK"],
    roleNameKeywords: ["qa", "tester", "fullstack"],
  },
  UAT: {
    assignedRole: "uat",
    projectMemberRoles: ["uat", "business_user", "client", "fullstack"],
    roleCodes: ["APPROVER", "REQUESTER", "FULLSTACK"],
    roleNameKeywords: ["uat", "client", "business user", "approver", "requester", "fullstack"],
  },
  MA: {
    assignedRole: "ma",
    projectMemberRoles: ["ma", "maintenance", "support", "fullstack"],
    roleCodes: ["DEVELOPER", "IT_MANAGER", "FULLSTACK"],
    roleNameKeywords: ["ma", "maintenance", "support", "it manager", "developer", "fullstack"],
  },
};

export type StepAssignmentRule = {
  stepCode: string;
  assignedRole: string;
  projectMemberRoles: string[];
  roleCodes: string[];
  roleNameKeywords: string[];
};

export type AssignableUserCandidate = {
  id: number;
  fullName: string;
  email: string | null;
  roleName: string | null;
  roles: string[];
  projectMemberRole: string | null;
  eligibleForStep: true;
  eligibilityReason: EligibilityReason;
};

export function normalizeRole(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getStepAssignmentRule(stepCode: string): StepAssignmentRule {
  const normalized = stepCode.toUpperCase();
  const rule = STEP_POSITION_RULES[normalized];

  return {
    stepCode: normalized,
    assignedRole: rule?.assignedRole ?? normalized.toLowerCase(),
    projectMemberRoles: rule?.projectMemberRoles ?? [normalized.toLowerCase()],
    roleCodes: rule?.roleCodes ?? [normalized],
    roleNameKeywords: rule?.roleNameKeywords ?? [normalized.toLowerCase()],
  };
}

export function getAssignedRoleForStep(stepCode: string) {
  return getStepAssignmentRule(stepCode).assignedRole;
}

function isAnyMatch(value: string, expected: string[]) {
  const normalized = normalizeRole(value);
  return expected.some((candidate) => normalized.includes(normalizeRole(candidate)));
}

export function resolveEligibilityReason(
  rolesInUse: string[],
  projectMemberRole: string | null,
  roleName: string | null,
  stepRule: StepAssignmentRule,
): EligibilityReason | null {
  const normalizedRoles = new Set(rolesInUse.map(normalizeRole));
  const normalizedProjectMemberRole = normalizeRole(projectMemberRole);
  const normalizedRoleName = normalizeRole(roleName);

  if (
    normalizedRoles.has("fullstack") ||
    normalizedProjectMemberRole.includes("fullstack") ||
    normalizedRoleName.includes("fullstack")
  ) {
    return "FULLSTACK";
  }

  if (
    projectMemberRole &&
    stepRule.projectMemberRoles.some((candidate) => normalizedProjectMemberRole.includes(normalizeRole(candidate)))
  ) {
    return "PROJECT_MEMBER";
  }

  if (
    rolesInUse.some((roleCode) => stepRule.roleCodes.some((candidate) => normalizeRole(candidate) === normalizeRole(roleCode)))
  ) {
    return "ROLE";
  }

  if (roleName && isAnyMatch(roleName, stepRule.roleNameKeywords)) {
    return "ROLE";
  }

  return null;
}

export async function getAssignableUsersForStep(mitId: number, stepId: number) {
  const [mit] = await db
    .select({ id: mitItems.id, projectId: mitItems.projectId })
    .from(mitItems)
    .where(eq(mitItems.id, mitId));

  if (!mit) throw new Error("MIT item not found");

  const [step] = await db
    .select({ id: workflowSteps.id, stepCode: workflowSteps.stepCode, isTerminal: workflowSteps.isTerminal })
    .from(workflowSteps)
    .where(eq(workflowSteps.id, stepId));

  if (!step) throw new Error("Workflow step not found");

  const stepRule = getStepAssignmentRule(step.stepCode);

  const userRows = await db
    .select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      roleName: users.roleName,
      roleCode: roles.code,
    })
    .from(users)
    .leftJoin(userRoles, eq(userRoles.userId, users.id))
    .leftJoin(roles, eq(roles.id, userRoles.roleId))
    .where(eq(users.isActive, true))
    .orderBy(users.fullName);

  const memberRows = await db
    .select({
      userId: projectMembers.userId,
      memberRole: projectMembers.memberRole,
    })
    .from(projectMembers)
    .where(eq(projectMembers.projectId, mit.projectId));

  const memberRoleMap = new Map<number, string>();
  for (const row of memberRows) {
    memberRoleMap.set(row.userId, row.memberRole);
  }

  const userMap = new Map<number, {
    id: number;
    fullName: string;
    email: string | null;
    roleName: string | null;
    roles: Set<string>;
  }>();

  for (const row of userRows) {
    const existing = userMap.get(row.id);
    if (!existing) {
      userMap.set(row.id, {
        id: row.id,
        fullName: row.fullName,
        email: row.email ?? null,
        roleName: row.roleName ?? null,
        roles: new Set(row.roleCode ? [row.roleCode] : []),
      });
      continue;
    }

    if (row.roleCode) existing.roles.add(row.roleCode);
  }

  const candidates: AssignableUserCandidate[] = [];

  for (const user of userMap.values()) {
    const projectMemberRole = memberRoleMap.get(user.id) ?? null;
    const eligibilityReason = resolveEligibilityReason(
      Array.from(user.roles),
      projectMemberRole,
      user.roleName,
      stepRule,
    );

    if (!eligibilityReason) continue;

    candidates.push({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      roleName: user.roleName,
      roles: Array.from(user.roles).sort(),
      projectMemberRole,
      eligibleForStep: true,
      eligibilityReason,
    });
  }

  candidates.sort((a, b) => a.fullName.localeCompare(b.fullName));

  return { mit, step, stepRule, candidates };
}

export async function assertAssignableUserForStep(mitId: number, stepId: number, userId: number) {
  const { candidates, step } = await getAssignableUsersForStep(mitId, stepId);
  const candidate = candidates.find((item) => item.id === userId);

  if (!candidate) {
    throw new Error("Selected user is not eligible for this position");
  }

  return {
    candidate,
    step,
    assignedRole: getAssignedRoleForStep(step.stepCode),
  };
}

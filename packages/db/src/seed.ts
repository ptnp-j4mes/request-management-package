import { db } from "./client";
import {
  users, projects, projectMembers,
  workflowDefinitions, workflowSteps,
  maintenanceAgreements, uatCycles, uatTestCases,
  requests, mitItems, mitStepAssignments, mitStatusHistory,
  botChannels,
} from "./schema";
import { count } from "drizzle-orm";

console.log("🌱 Seeding database...");

// Skip if already seeded
const [{ total }] = await db.select({ total: count() }).from(users);
if (Number(total) > 0) {
  console.log("⏭️  Database already seeded, skipping.");
  process.exit(0);
}

// ── Users ────────────────────────────────────────────────────────────────────
const [alice, bob, carol, dan] = await db.insert(users).values([
  { username: "alice", fullName: "Alice Developer", email: "alice@example.com", roleName: "Developer", companyName: "Internal" },
  { username: "bob", fullName: "Bob QA", email: "bob@example.com", roleName: "QA Engineer", companyName: "Internal" },
  { username: "carol", fullName: "Carol UAT", email: "carol@example.com", roleName: "UAT Analyst", companyName: "Client A" },
  { username: "dan", fullName: "Dan Manager", email: "dan@example.com", roleName: "Project Manager", companyName: "Internal" },
]).returning();

// ── Projects ─────────────────────────────────────────────────────────────────
const [projectA, projectB] = await db.insert(projects).values([
  { projectCode: "PROJ-A", projectName: "Alpha Platform", customerName: "Client A", startDate: "2025-01-01", status: "active" },
  { projectCode: "PROJ-B", projectName: "Beta Portal", customerName: "Client B", startDate: "2025-03-01", status: "active" },
]).returning();

await db.insert(projectMembers).values([
  { projectId: projectA.id, userId: alice.id, memberRole: "developer" },
  { projectId: projectA.id, userId: bob.id, memberRole: "qa" },
  { projectId: projectA.id, userId: carol.id, memberRole: "uat" },
  { projectId: projectA.id, userId: dan.id, memberRole: "manager" },
  { projectId: projectB.id, userId: alice.id, memberRole: "developer" },
  { projectId: projectB.id, userId: bob.id, memberRole: "qa" },
]);

// ── Default Workflow: DEV → QA → UAT → MA ────────────────────────────────────
const [defaultWorkflow] = await db.insert(workflowDefinitions).values([
  { name: "Default Workflow (DEV→QA→UAT→MA)", description: "Standard 4-step delivery workflow", isDefault: true },
]).returning();

const [stepDev, stepQa, stepUat, stepMa] = await db.insert(workflowSteps).values([
  { workflowId: defaultWorkflow.id, stepCode: "DEV", stepName: "Development", stepOrder: 1, isTerminal: false },
  { workflowId: defaultWorkflow.id, stepCode: "QA", stepName: "Quality Assurance", stepOrder: 2, isTerminal: false },
  { workflowId: defaultWorkflow.id, stepCode: "UAT", stepName: "User Acceptance Testing", stepOrder: 3, isTerminal: false },
  { workflowId: defaultWorkflow.id, stepCode: "MA", stepName: "Maintenance", stepOrder: 4, isTerminal: true },
]).returning();

// ── Maintenance Agreement ─────────────────────────────────────────────────────
const [maA] = await db.insert(maintenanceAgreements).values([
  { projectId: projectA.id, maType: "annual", startDate: "2025-01-01", endDate: "2025-12-31", status: "active" },
]).returning();

// ── UAT Cycle ─────────────────────────────────────────────────────────────────
const [cycleA] = await db.insert(uatCycles).values([
  { projectId: projectA.id, cycleName: "UAT Cycle 1", startDate: "2025-02-01", endDate: "2025-02-28", status: "active" },
]).returning();

await db.insert(uatTestCases).values([
  { projectId: projectA.id, testCaseCode: "TC-001", title: "User Login", moduleName: "Auth", priority: "high" },
  { projectId: projectA.id, testCaseCode: "TC-002", title: "Create Request", moduleName: "Request", priority: "high" },
  { projectId: projectA.id, testCaseCode: "TC-003", title: "MIT Board View", moduleName: "MIT", priority: "medium" },
]);

// ── Bot Channels ──────────────────────────────────────────────────────────────
await db.insert(botChannels).values([
  { channelCode: "LINE", channelName: "LINE Messaging" },
  { channelCode: "PORTAL", channelName: "Web Portal" },
  { channelCode: "EMAIL", channelName: "Email" },
]);

// ── Sample Requests ───────────────────────────────────────────────────────────
const [req1, req2, req3] = await db.insert(requests).values([
  {
    requestNo: "REQ-20250001",
    projectId: projectA.id,
    requesterUserId: carol.id,
    channel: "portal",
    requestType: "bug",
    subject: "Login page throws 500 error on IE",
    description: "Users on Internet Explorer cannot log in. The page returns HTTP 500.",
    priority: "high",
    urgency: "high",
    status: "open",
    uatCycleId: cycleA.id,
  },
  {
    requestNo: "REQ-20250002",
    projectId: projectA.id,
    requesterUserId: carol.id,
    channel: "portal",
    requestType: "change_request",
    subject: "Add export to Excel on report page",
    description: "Users need an Excel export button on the monthly report page.",
    priority: "medium",
    urgency: "low",
    status: "open",
    maId: maA.id,
  },
  {
    requestNo: "REQ-20250003",
    projectId: projectB.id,
    requesterUserId: dan.id,
    channel: "email",
    requestType: "support",
    subject: "How to reset password?",
    description: "User forgot their password and needs instructions.",
    priority: "low",
    status: "new",
  },
]).returning();

// ── Sample MIT Items (linked to requests, in DEV step) ────────────────────────
const [mit1, mit2] = await db.insert(mitItems).values([
  {
    mitNo: "MIT-20250001",
    projectId: projectA.id,
    requestId: req1.id,
    createdBy: dan.id,
    itemType: "bug_fix",
    title: "Fix login 500 error",
    moduleName: "Auth",
    priority: "high",
    status: "assigned",
    currentOwnerUserId: alice.id,
    currentStepId: stepDev.id,
    currentStepCode: "DEV",
    currentStatus: "assigned",
    plannedEndDate: "2025-02-15",
  },
  {
    mitNo: "MIT-20250002",
    projectId: projectA.id,
    requestId: req2.id,
    createdBy: dan.id,
    itemType: "change",
    title: "Implement Excel export",
    moduleName: "Reports",
    priority: "medium",
    status: "in_progress",
    currentOwnerUserId: alice.id,
    currentStepId: stepDev.id,
    currentStepCode: "DEV",
    currentStatus: "in_progress",
    plannedEndDate: "2025-03-01",
  },
]).returning();

// MIT waiting for QA
const [mit3] = await db.insert(mitItems).values([
  {
    mitNo: "MIT-20250003",
    projectId: projectA.id,
    requestId: req1.id,
    createdBy: dan.id,
    itemType: "bug_fix",
    title: "Fix session timeout issue",
    moduleName: "Auth",
    priority: "high",
    status: "assigned",
    currentOwnerUserId: bob.id,
    currentStepId: stepQa.id,
    currentStepCode: "QA",
    currentStatus: "waiting_test",
    plannedEndDate: "2025-02-20",
  },
]).returning();

// ── Step Assignments ──────────────────────────────────────────────────────────
await db.insert(mitStepAssignments).values([
  { mitItemId: mit1.id, stepId: stepDev.id, assignedUserId: alice.id, assignedRole: "developer", assignmentStatus: "assigned" },
  { mitItemId: mit2.id, stepId: stepDev.id, assignedUserId: alice.id, assignedRole: "developer", assignmentStatus: "accepted", acceptedAt: new Date() },
  { mitItemId: mit3.id, stepId: stepDev.id, assignedUserId: alice.id, assignedRole: "developer", assignmentStatus: "completed", completedAt: new Date() },
  { mitItemId: mit3.id, stepId: stepQa.id, assignedUserId: bob.id, assignedRole: "qa", assignmentStatus: "assigned" },
]);

// ── Status History ────────────────────────────────────────────────────────────
await db.insert(mitStatusHistory).values([
  { mitItemId: mit1.id, oldStatus: "new", newStatus: "assigned", changedBy: dan.id, remark: "Initial assignment" },
  { mitItemId: mit2.id, oldStatus: "new", newStatus: "assigned", changedBy: dan.id },
  { mitItemId: mit2.id, oldStatus: "assigned", newStatus: "in_progress", changedBy: alice.id },
  { mitItemId: mit3.id, oldStatus: "new", newStatus: "assigned", changedBy: dan.id },
  { mitItemId: mit3.id, oldStatus: "assigned", newStatus: "waiting_test", changedBy: alice.id, remark: "Submitted to QA" },
]);

console.log("✅ Seed complete");
console.log(`  - 4 users, 2 projects`);
console.log(`  - Workflow: DEV(${stepDev.id}) → QA(${stepQa.id}) → UAT(${stepUat.id}) → MA(${stepMa.id})`);
console.log(`  - 3 requests, 3 MIT items`);

process.exit(0);

You are working in repo: ptnp-j4mes/management-request-platform

Issue / Goal:
Refactor the product boundary between Requests and Projects.

New product rule:

- /requests/:id is only for intake: user submits a platform/request need, approver reviews it, requester tracks progress, and requester can perform UAT feedback / report bugs.
- All execution and project operations must move to /projects/:id.
- /projects/:id becomes the operational workspace where managers/team can:
  1. create requests and link them to the project
  2. create and assign MIT items
  3. manage UAT cycles, test cases, test results, and UAT bugs/defects
  4. manage project status
  5. manage project work checklist/tasks
  6. assign tasks by feature/module and optionally link each task to MIT items and assignees

Current repo context:

- Stack: Bun monorepo, Next.js 14 frontend, Elysia API, PostgreSQL + Drizzle.
- Frontend project page:
  apps/web/app/projects/[id]/page.tsx
  Currently has tabs:
  Progress, Requests, MIT Items, UAT, Meetings, Members, GitHub
  but Requests/MIT/UAT are mostly display/placeholder, not full operation management.
- Frontend request detail page:
  apps/web/app/requests/[id]/page.tsx
  Currently shows details, project link, assignees, status history, comments, and includes RequestActions.
- Request workflow action UI:
  apps/web/components/requests/RequestActions.tsx
  Currently supports submit, approve, reject, assign BA, assign dev, assign QA, start development, ready QA, QA pass/fail, UAT approve, close.
  This must be reduced.
- Backend requests router:
  apps/api/src/modules/requests/router.ts
  Currently includes endpoints for assign BA/dev/QA, development, QA, UAT approve, close.
  These execution endpoints should be deprecated or moved to project/MIT/UAT routes.
- Existing project router:
  apps/api/src/modules/projects/router.ts
  Supports list/get/create/update and project members.
- Existing MIT router:
  apps/api/src/modules/mit-items/router.ts
  Supports MIT list/get/create/patch and workflow actions assign/accept/submit/return/deploy.
- Existing UAT router:
  apps/api/src/modules/uat/router.ts
  Supports cycles, test cases, test results, and UAT cycle comments/defects.
- Existing DB:
  packages/db/src/schema/projects.ts
  packages/db/src/schema/requests.ts
  packages/db/src/schema/mit.ts
  packages/db/src/schema/uat.ts
- Existing shared types:
  packages/types/src/enums.ts
  packages/types/src/schemas.ts

Important current inconsistency:

- requests.projectId is currently notNull in packages/db/src/schema/requests.ts.
- But /requests/:id UI has "Link Project" behavior when no projectId.
- Decide and implement one consistent rule:
  Preferred new rule:
  - Request can be created before project is linked.
  - projectId should become nullable.
  - When approved, approver/manager can link it to an existing project or create a new project from the request.
    If changing schema to nullable, generate a Drizzle migration.

Required UX / Product Behavior:

A. /requests/:id new responsibility
Request detail should be simplified to:

- Show request details.
- Allow requester to submit draft.
- Allow approver/IT manager/admin to approve or reject.
- Allow linking to project after approval.
- Show linked project card and progress summary from project/MIT/UAT.
- Allow requester to add comments.
- Allow requester to create UAT feedback / bug report only when the linked project is in UAT or has active UAT cycle.
- Do not allow request page to assign BA/dev/QA.
- Do not allow request page to start development, ready QA, QA pass/fail, or close execution work.
- The request page should point users to /projects/:id for operational work.

Keep only these request actions:

- submit
- approve
- reject
- link/create project from approved request
- add comment
- add UAT feedback / report bug when allowed

Remove or hide these from RequestActions:

- assign-ba
- assign-dev
- assign-qa
- start-development
- ready-for-qa
- qa-pass
- qa-fail
- close request as execution action
- uat-approve if it is actually project/UAT-cycle level approval

Backend:

- Keep old endpoints temporarily if needed for backward compatibility, but mark deprecated or stop exposing them in UI.
- Prefer moving execution flow to MIT/project/UAT endpoints.

B. /projects/:id new responsibility
Project detail becomes the main workspace.

Required tabs:

1. Overview / Progress
2. Requests
3. MIT Items
4. Project Tasks / Checklist
5. UAT
6. Members
7. Settings / Status
8. GitHub / Meetings can remain if already present

Project Requests tab:

- List all requests linked to this project.
- Add "Create Request" button that creates a request with projectId prefilled.
- Add "Link Existing Request" button for approved/unlinked requests.
- Show request status, requester, type, priority, created date.
- Allow unlink only for admin/IT manager if safe.
- Allow opening request detail in read-only/intake view.

Project MIT Items tab:

- List MIT items linked to this project.
- Add "Create MIT" button.
- MIT creation should allow:
  - requestId optional
  - title
  - itemType
  - moduleName
  - featureName if implemented
  - priority/severity
  - estimatedHours/estimatedMd
  - planned dates
  - initial workflow step
  - initial assignee
- Add assign action using existing /mit-items/:id/assign.
- Add accept/submit/return/deploy actions through existing MIT workflow.
- Show owner, current step, status, module, linked request, checklist progress.

Project Tasks / Checklist tab:
Create a new checklist/task feature for project execution.

Need new DB schema, suggested:
packages/db/src/schema/projectTasks.ts

Table: project_tasks

- id
- projectId references projects.id
- requestId nullable references requests.id
- mitItemId nullable references mitItems.id
- parentTaskId nullable references projectTasks.id
- title
- description nullable
- featureName nullable
- moduleName nullable
- taskType varchar: feature | module | bug | uat_fix | support | checklist | other
- status varchar: todo | in_progress | blocked | review | done | cancelled
- priority varchar nullable
- assignedUserId nullable references users.id
- createdByUserId nullable references users.id
- dueDate nullable
- sortOrder integer
- completedAt nullable
- createdAt
- updatedAt

Indexes:

- projectId
- mitItemId
- assignedUserId
- status
- moduleName
- featureName

Behavior:

- Project task can exist independently as checklist item.
- Project task can be linked to a MIT item.
- One MIT item can have many checklist tasks.
- Tasks can be grouped by featureName or moduleName.
- Each task can be assigned to one user initially.
- If multi-assignee is needed later, design for future but implement single assignedUserId now unless schema already supports many-to-many.
- Task status changes should be tracked either by updatedAt only or optional status history table if quick to add.

Add backend router:
apps/api/src/modules/project-tasks/router.ts

Required endpoints:

- GET /projects/:projectId/tasks
  Query filters:
  status, assignedUserId, moduleName, featureName, mitItemId
- POST /projects/:projectId/tasks
- GET /project-tasks/:id
- PATCH /project-tasks/:id
- DELETE /project-tasks/:id
  Prefer soft delete/status cancelled if there are references.
- POST /project-tasks/:id/complete
- POST /project-tasks/:id/reopen
- POST /project-tasks/bulk-reorder
- POST /project-tasks/:id/link-mit
- DELETE /project-tasks/:id/link-mit

Permissions:

- IT_MANAGER, ADMIN, BA, FULLSTACK can create/manage project tasks.
- Assigned user can update their own task status.
- Requester should not manage project tasks unless they have internal role.

Project Tasks UI:

- Add checklist board/table in /projects/:id.
- Group by moduleName or featureName.
- Show checkbox for done.
- Show assignee.
- Show linked MIT badge/link.
- Support create/edit/delete.
- Support assign user.
- Support link/unlink MIT item.
- Show progress summary:
  completedTasks / totalTasks
  by module
  by assignee
  by MIT item

Project UAT tab:
Use existing UAT APIs but scope by project.
Existing UAT router currently has global:

- GET /uat/cycles
- GET /uat/test-cases
- GET /uat/test-results
  Need project-scoped endpoints:
- GET /projects/:projectId/uat/cycles
- POST /projects/:projectId/uat/cycles
- PATCH /uat/cycles/:id
- GET /projects/:projectId/uat/test-cases
- POST /projects/:projectId/uat/test-cases
- PATCH /uat/test-cases/:id
- GET /uat/cycles/:id/results
- POST /uat/cycles/:id/results
- GET /uat/cycles/:id/comments
- POST /uat/cycles/:id/comments
- PATCH /uat/cycles/:id/comments/:commentId

UAT behavior:

- Project team can manage cycles/test cases/results.
- Requester/client can add UAT comments/defects only on cycles linked to their request/project or if they are allowed participants.
- UAT defect should be linkable to:
  - requestId
  - mitItemId optional
  - projectTaskId optional if project task feature is added
- Add action "Create MIT from UAT defect" in project UAT tab for internal roles.
- Add action "Create Project Task from UAT defect".

Project status management:
Existing projects.status enum is active | on_hold | completed | cancelled.
Add project status control in /projects/:id Settings/Status tab.
Backend:

- PATCH /projects/:id already exists.
- Add explicit endpoint if clearer:
  PATCH /projects/:id/status
  Body:
  {
  status,
  note?
  }
- Add project status history if quick:
  project_status_history
  id, projectId, oldStatus, newStatus, changedBy, note, changedAt
- If not adding history, at least update updatedAt and show current status.
  UI:
- Allow ADMIN/IT_MANAGER to change project status.
- Show warning when completing/cancelling if open MIT/tasks/UAT defects remain.

C. Request backend refactor
Update apps/api/src/modules/requests/router.ts.

Keep:

- GET /requests
- GET /requests/:id
- POST /requests
- PATCH /requests/:id for intake metadata only
- POST /requests/:id/submit
- POST /requests/:id/approve
- POST /requests/:id/reject
- POST /requests/:id/comments
- GET /requests/:id/comments
- PATCH /requests/:id/link-project or existing PATCH body { projectId }

Remove from UI and preferably deprecate in API:

- POST /requests/:id/assign-ba
- POST /requests/:id/assign-dev
- POST /requests/:id/assign-qa
- POST /requests/:id/start-development
- POST /requests/:id/ready-for-qa
- POST /requests/:id/qa-pass
- POST /requests/:id/qa-fail
- POST /requests/:id/uat-approve
- POST /requests/:id/close

New request status model:
The current code uses statuses like draft, submitted, manager_approved, ba_review, assigned_to_dev, in_development, ready_for_qa, in_qa, uat, completed.
But packages/types/src/enums.ts RequestStatus currently defines only:
new, open, in_progress, waiting, resolved, closed, rejected.
Fix this mismatch.

Preferred simplified RequestStatus:

- draft
- submitted
- approved
- rejected
- linked_to_project
- in_progress
- uat
- completed
- closed

Meaning:

- draft/submitted/approved/rejected are intake statuses.
- linked_to_project means accepted into a project.
- in_progress/uat/completed are progress mirror statuses derived from project/MIT/UAT, not direct execution controls.
- closed means final request closed after project/UAT completion.

D. Project progress source of truth
Project progress should be computed from:

- linked requests
- MIT items
- project tasks/checklist
- UAT cycles/comments/defects
- project status

Do not duplicate too much state in requests.
Request progress shown to requester should read linked project summary and MIT/UAT progress.

Add endpoint:
GET /projects/:id/progress-summary

Return:
{
project,
requestSummary: {
total,
byStatus
},
mitSummary: {
total,
byStep,
byStatus,
completed,
deployed
},
taskSummary: {
total,
done,
blocked,
byAssignee,
byModule,
byFeature
},
uatSummary: {
cycles,
openDefects,
resolvedDefects,
passCount,
failCount,
blockedCount
}
}

Use this in:

- /projects/:id Overview
- /requests/:id linked project progress section

E. Frontend changes

Update apps/web/app/requests/[id]/page.tsx:

- Remove operational assignee panel or relabel it as progress summary if kept.
- Remove RequestActions that expose dev/qa workflow.
- Replace RequestActions with IntakeActions:
  - Submit
  - Approve
  - Reject
  - Link/Create Project
  - Add Comment
  - Add UAT Feedback/Bug when allowed
- Show linked project progress card:
  - project status
  - MIT progress
  - task checklist progress
  - UAT status/open defects
- Add CTA:
  "Open Project Workspace" linking to /projects/:id

Update or replace apps/web/components/requests/RequestActions.tsx:

- Split into:
  components/requests/IntakeActions.tsx
  or refactor existing component.
- Ensure it only renders intake actions.

Update apps/web/app/projects/[id]/page.tsx:

- Make Project page operational:
  - Requests tab: create/link requests
  - MIT Items tab: create/assign/manage MIT items
  - Project Tasks tab: checklist by feature/module + assign + link MIT
  - UAT tab: manage cycles/test cases/results/defects
  - Settings/Status tab: project status management
- Reuse existing GlassCard, GlassTable, GlassTabs, GlassBadge, GlassButton, GlassModal, GlassInput style.
- Avoid introducing a new UI framework.

Update apps/web/lib/api.ts:
Add helpers:

- projectRequestsApi or projectsApi methods:
  - listRequests(projectId)
  - createRequest(projectId, body)
  - linkRequest(projectId, requestId)
  - unlinkRequest(projectId, requestId)
  - progressSummary(projectId)
  - updateStatus(projectId, body)
- projectTasksApi:
  - list(projectId, filters)
  - create(projectId, body)
  - update(id, body)
  - delete(id)
  - complete(id)
  - reopen(id)
  - linkMit(id, mitItemId)
  - unlinkMit(id)
- projectUatApi:
  - listCycles(projectId)
  - createCycle(projectId, body)
  - listTestCases(projectId)
  - createTestCase(projectId, body)
  - createResult(cycleId, body)
  - listComments(cycleId)
  - addComment(cycleId, body)
- keep mitApi and requestsApi but remove request execution helpers from UI usage.

F. Authorization
Backend must enforce:

- Requester:
  - create own request
  - submit own draft
  - view own requests
  - comment on own request
  - add UAT feedback/bug on linked project when allowed
- Approver:
  - approve/reject submitted request
- IT_MANAGER/ADMIN:
  - link request to project
  - create project from request
  - manage project status
  - create/assign MIT
  - manage tasks/checklist
  - manage UAT
- BA/FULLSTACK:
  - project execution actions if project member/internal role
- Assigned users:
  - update own MIT/task status where appropriate

G. Data migration / compatibility

- If making requests.projectId nullable, generate migration.
- Ensure existing requests keep their projectId.
- Existing request statuses using old execution statuses should be mapped or still displayed gracefully.
- Do not break seed data.
- Update seed if needed to include example:
  - one request linked to project
  - MIT items
  - project checklist tasks
  - UAT cycle with defect
  - requester tracking progress

H. Acceptance criteria

1. A user can create a request as intake.
2. An approver can approve/reject the request.
3. After approval, internal role can link the request to a project or create a project from it.
4. /requests/:id no longer shows assign dev/qa/start dev/QA pass/QA fail execution actions.
5. /requests/:id shows linked project progress and UAT feedback entry point.
6. /projects/:id can create a request already linked to the project.
7. /projects/:id can create and assign MIT items.
8. /projects/:id can manage UAT cycles/test cases/results/comments/defects.
9. /projects/:id can update project status.
10. /projects/:id has Project Tasks / Checklist by feature/module.
11. A project task can be assigned to a user.
12. A project task can link to a MIT item.
13. Project progress summary reflects MIT + checklist + UAT.
14. Requester can track progress but cannot execute internal project workflow.
15. Build passes.

Suggested files to touch:

- apps/api/src/modules/requests/router.ts
- apps/api/src/modules/projects/router.ts
- apps/api/src/modules/mit-items/router.ts
- apps/api/src/modules/uat/router.ts
- apps/api/src/modules/project-tasks/router.ts
- apps/api/src/index.ts
- packages/db/src/schema/requests.ts
- packages/db/src/schema/projects.ts
- packages/db/src/schema/projectTasks.ts
- packages/db/src/schema/index.ts
- packages/types/src/enums.ts
- packages/types/src/schemas.ts
- apps/web/app/requests/[id]/page.tsx
- apps/web/components/requests/RequestActions.tsx or new IntakeActions.tsx
- apps/web/app/projects/[id]/page.tsx
- apps/web/lib/api.ts
- packages/db/src/seed.ts

Commands:
bun install
bun run build
bun run db:generate # if schema changes
bun run db:migrate # if migration generated and local DB is intended
bun run db:seed # if seed changed

Return:

- summary of boundary change
- API endpoints added/changed/deprecated
- DB schema/migration notes
- frontend pages/components changed
- build result
- risks/follow-up tasks

# Project Center & Performance Management Roadmap

Repo: `ptnp-j4mes/management-request-platform`

## Purpose

เอกสารนี้สรุปแนวทางพัฒนา platform ให้เป็นศูนย์กลางของทีมสำหรับการจัดการ Project, Request, MIT, UAT, Performance, Reporting และ Executive Dashboard

เป้าหมายหลักคือเปลี่ยนระบบจาก “ระบบติดตามงาน” ให้เป็น “Project Command Center” ที่วัดความสำเร็จของ project ได้จริง และช่วยให้ทีม/ผู้บริหารเห็นภาพรวมที่ชัดเจน

---

## Product Direction

### Current Direction

ระบบมี foundation ที่ดีอยู่แล้ว ได้แก่:

- Request intake
- Project management
- MIT workflow
- UAT cycle/test case/test result
- Workload report
- User performance monthly
- GitHub/project integration concept
- Meeting/bot integration concept

แต่ยังขาด layer สำคัญสำหรับ:

- Project success measurement
- Project task/checklist
- Executive dashboard
- Health score
- Risk/issue/change/decision tracking
- Performance aggregation
- Cross-project portfolio view

### Target Direction

ให้ `Project` เป็นศูนย์กลางของงานทั้งหมด

```text
Request = Intake / Approval / User Progress / UAT Feedback
Project = Workspace / Execution / Planning / Monitoring / Reporting
MIT     = Technical execution item
Task    = Project checklist / feature/module work item
UAT     = Acceptance and quality validation
Report  = Management and executive visibility
```

---

# Phase 0 — Product Boundary & Data Model Alignment

## Goal

จัด boundary ของระบบให้ชัดเจนก่อนเพิ่ม feature ใหม่ เพื่อไม่ให้ logic กระจัดกระจายระหว่าง Request, Project, MIT และ UAT

## Tasks

### TASK-0.1 — Define Request vs Project Responsibility

**Description**

กำหนด role ของแต่ละ entity ให้ชัดเจน

**Request should handle:**

- รับเรื่องที่ user ต้องการขอสร้าง/แก้ไข platform
- Submit request
- Approve/reject request
- ติดตาม progress
- Comment
- UAT feedback / report bug

**Project should handle:**

- Planning
- Team assignment
- MIT execution
- Checklist/task
- UAT operation
- Project status
- Project report
- Performance tracking

**Deliverable**

- Documented product boundary
- Updated UI wording
- Updated permission model

**Acceptance Criteria**

- `/requests/:id` ไม่แสดง execution actions เช่น assign dev/qa/start dev/QA pass
- `/projects/:id` เป็นพื้นที่หลักสำหรับจัดการ execution
- ทีมเข้าใจว่า Request เป็น intake ไม่ใช่ workspace

---

### TASK-0.2 — Normalize Request Status Model

**Description**

ปรับ request status ให้สะท้อน intake lifecycle มากกว่า execution lifecycle

**Suggested Request Status**

```text
draft
submitted
approved
rejected
linked_to_project
in_progress
uat
completed
closed
```

**Deliverable**

- Update `packages/types/src/enums.ts`
- Update request router transition logic
- Optional DB migration if needed

**Acceptance Criteria**

- Request status ไม่ปนกับ dev/qa execution status
- Progress ของ request อ่านจาก linked project/MIT/UAT ได้
- Old statuses ยัง display ได้อย่างปลอดภัยหรือมี migration strategy

---

### TASK-0.3 — Decide Nullable Project Link for Request

**Description**

ปัจจุบัน request มีแนวคิด link project แต่ schema อาจบังคับ `projectId` เสมอ ต้องตัดสินใจให้ชัด

**Preferred Rule**

- Request สามารถสร้างก่อนมี project ได้
- หลัง approve จึง link กับ existing project หรือ create project from request

**Deliverable**

- Make `requests.projectId` nullable if needed
- Migration
- Update request create/link logic

**Acceptance Criteria**

- User สร้าง request ได้โดยยังไม่ต้องเลือก project
- Approver/IT manager link project หลัง approve ได้
- Existing data ไม่เสียหาย

---

# Phase 1 — Project Workspace Foundation

## Goal

ทำให้ `/projects/:id` เป็น workspace หลักของทีม

## Tasks

### TASK-1.1 — Redesign Project Page Tabs

**Suggested Tabs**

1. Overview
2. Requests
3. MIT Items
4. Tasks / Checklist
5. UAT
6. Risks / Issues / Decisions
7. Members
8. Reports
9. Settings / Status
10. GitHub / Meetings

**Deliverable**

- Update `apps/web/app/projects/[id]/page.tsx`
- Split large page into smaller components if needed

**Acceptance Criteria**

- Project page ใช้งานเป็นศูนย์กลางได้
- แต่ละ tab มีหน้าที่ชัดเจน
- ไม่ใช่แค่ display table แต่มี action สำคัญครบ

---

### TASK-1.2 — Project Overview Summary

**Description**

เพิ่ม overview ที่สรุป health และ progress ของ project

**Metrics**

- Project status
- Overall progress %
- Request count
- MIT total/completed/deployed
- Task completed/total
- UAT pass/fail/blocked
- Open defects
- Overdue items
- Blocked tasks
- Upcoming milestone
- Go-live readiness

**Backend**

Add endpoint:

```http
GET /projects/:id/progress-summary
```

**Acceptance Criteria**

- Overview แสดงสถานะ project ได้ในหน้าเดียว
- ผู้บริหาร/PM เข้าใจ project health ภายใน 30 วินาที

---

### TASK-1.3 — Project Status Management

**Description**

เพิ่มการจัดการสถานะ project ให้ชัดเจน

**Statuses**

```text
active
on_hold
completed
cancelled
```

Optional future statuses:

```text
planning
development
uat
go_live
maintenance
```

**Backend**

```http
PATCH /projects/:id/status
```

**Recommended body**

```json
{
  "status": "on_hold",
  "note": "Waiting customer confirmation"
}
```

**Optional DB**

`project_status_history`

**Acceptance Criteria**

- ADMIN/IT_MANAGER เปลี่ยน project status ได้
- มี note/reason
- มี warning หากจะ complete/cancel project ที่ยังมี open MIT/task/UAT defects

---

# Phase 2 — Request Intake Simplification

## Goal

ลด `/requests/:id` ให้ทำหน้าที่ intake และ progress tracking เท่านั้น

## Tasks

### TASK-2.1 — Replace RequestActions with IntakeActions

**Current Problem**

Request action ปัจจุบันมี execution actions เช่น:

- assign BA
- assign dev
- assign QA
- start development
- ready for QA
- QA pass/fail
- UAT approve
- close

สิ่งเหล่านี้ควรถูกย้ายไป project/MIT/UAT

**New IntakeActions**

- submit
- approve
- reject
- link project
- create project from request
- add comment
- add UAT feedback / report bug

**Frontend**

- Replace or refactor `apps/web/components/requests/RequestActions.tsx`
- Update `apps/web/app/requests/[id]/page.tsx`

**Acceptance Criteria**

- Request page ไม่มี execution action
- Requester เห็น progress ได้
- Internal team ใช้ project workspace สำหรับงานจริง

---

### TASK-2.2 — Request Progress Card

**Description**

ใน `/requests/:id` แสดง progress ของ linked project แบบอ่านง่าย

**Data Source**

- linked project
- MIT summary
- task summary
- UAT summary
- project health score

**Acceptance Criteria**

- User/requester เห็นว่า request ของตัวเองอยู่ขั้นไหน
- มี CTA ไป project workspace เฉพาะคนที่มี permission
- User ทั่วไปไม่เห็น operation internal เกินจำเป็น

---

### TASK-2.3 — UAT Feedback from Request Page

**Description**

ให้ requester/client สามารถแจ้ง bug หรือ feedback ในช่วง UAT ได้

**Behavior**

- Allow feedback only if:
  - request linked to project
  - project has active UAT cycle
  - user is requester or allowed participant

**Backend**

Could reuse UAT comment/defect flow:

```http
POST /uat/cycles/:id/comments
```

with:

```json
{
  "commentType": "defect",
  "severity": "high",
  "linkedRequestId": 123,
  "commentText": "..."
}
```

**Acceptance Criteria**

- Requester แจ้ง bug ได้
- Bug ถูก link กับ request/project/UAT cycle
- Internal team สามารถ convert defect เป็น MIT หรือ project task ได้

---

# Phase 3 — Project Requests Management

## Goal

ให้ project สามารถจัดการ request ที่เกี่ยวข้องได้ครบ

## Tasks

### TASK-3.1 — Project Requests Tab

**Features**

- List linked requests
- Create request under project
- Link existing approved/unlinked request
- Unlink request if safe
- Show request status/type/priority/requester
- Open request detail

**Backend**

Suggested endpoints:

```http
GET /projects/:id/requests
POST /projects/:id/requests
POST /projects/:id/link-request
DELETE /projects/:id/requests/:requestId
```

**Acceptance Criteria**

- PM สร้าง request จาก project page ได้
- Approved request สามารถถูก link เข้า project ได้
- Request tab กลายเป็น bridge ระหว่าง intake กับ execution

---

### TASK-3.2 — Create Project from Approved Request

**Description**

เพิ่ม action สำหรับสร้าง project จาก request ที่ approve แล้ว

**Backend**

```http
POST /requests/:id/create-project
```

**Behavior**

- Create project
- Link request to project
- Optionally create initial MIT/task from request
- Set request status = `linked_to_project`

**Acceptance Criteria**

- Approved request สามารถกลายเป็น project ได้
- ลด manual step ของ PM/IT manager

---

# Phase 4 — MIT Execution Enhancement

## Goal

ทำให้ MIT เป็น execution unit หลักที่ผูกกับ project/request/task ได้ดีขึ้น

## Tasks

### TASK-4.1 — Create MIT from Project Page

**Fields**

- requestId optional
- title
- description
- itemType
- moduleName
- featureName optional
- priority
- severity
- estimatedHours
- estimatedMd
- plannedStartDate
- plannedEndDate
- initialStepId
- initialAssigneeUserId

**Backend**

Use existing:

```http
POST /mit-items
POST /mit-items/:id/assign
```

May add project scoped wrapper:

```http
POST /projects/:id/mit-items
```

**Acceptance Criteria**

- PM/IT manager สร้าง MIT จาก project page ได้
- MIT link กับ request ได้
- MIT assign owner/step ได้ทันที

---

### TASK-4.2 — MIT Board in Project Page

**Views**

- Kanban by workflow step
- Table by owner/status/module
- Filter by request/module/feature/assignee
- Show overdue
- Show linked tasks/checklist progress

**Acceptance Criteria**

- ทีมเห็น execution state ของ project ได้จาก project page
- ไม่ต้องไป board รวมทุก project เสมอ

---

### TASK-4.3 — MIT Assignment Eligibility

**Description**

ปรับ assignment ให้ดึงคนตาม position/step และ FULLSTACK ทำได้ทุกตำแหน่ง

**Rules**

- DEV: developer + fullstack
- QA: qa + fullstack
- UAT: uat/client/approver/requester + fullstack
- MA: maintenance/support/IT manager/developer/fullstack

**Acceptance Criteria**

- Dropdown แสดง eligible users เท่านั้น
- Backend validate ด้วย ไม่เชื่อ frontend อย่างเดียว
- FULLSTACK assign ได้ทุก step

---

# Phase 5 — Project Tasks / Checklist

## Goal

เพิ่ม task/checklist layer เพื่อแตกงานตาม feature/module และ assign ให้แต่ละคน

## Tasks

### TASK-5.1 — Add Project Task Schema

**Suggested table**

`project_tasks`

Fields:

```text
id
projectId
requestId nullable
mitItemId nullable
parentTaskId nullable
title
description nullable
featureName nullable
moduleName nullable
taskType
status
priority nullable
assignedUserId nullable
createdByUserId nullable
dueDate nullable
sortOrder
completedAt nullable
createdAt
updatedAt
```

**Suggested taskType**

```text
feature
module
bug
uat_fix
support
checklist
other
```

**Suggested status**

```text
todo
in_progress
blocked
review
done
cancelled
```

**Acceptance Criteria**

- Project มี checklist ได้
- Task ผูกกับ MIT ได้
- Task assign user ได้
- Task group by feature/module ได้

---

### TASK-5.2 — Project Tasks API

**Backend**

Create:

`apps/api/src/modules/project-tasks/router.ts`

Register in:

`apps/api/src/index.ts`

**Endpoints**

```http
GET /projects/:projectId/tasks
POST /projects/:projectId/tasks
GET /project-tasks/:id
PATCH /project-tasks/:id
DELETE /project-tasks/:id
POST /project-tasks/:id/complete
POST /project-tasks/:id/reopen
POST /project-tasks/:id/link-mit
DELETE /project-tasks/:id/link-mit
POST /project-tasks/bulk-reorder
```

**Acceptance Criteria**

- CRUD task ได้
- Assign task ได้
- Complete/reopen ได้
- Link/unlink MIT ได้
- Filter by module/feature/assignee/status ได้

---

### TASK-5.3 — Project Checklist UI

**Frontend**

Add tab in `/projects/:id`:

`Tasks / Checklist`

**Features**

- Create/edit/delete task
- Checkbox complete
- Assign user
- Set module/feature
- Link MIT item
- Filter by assignee/status/module/feature
- Group by module or feature
- Progress bar

**Acceptance Criteria**

- PM เห็น task ย่อยของ project
- Developer/QA เห็น task ที่ตนรับผิดชอบ
- ผู้บริหารเห็น checklist completion %

---

# Phase 6 — UAT & Quality Management

## Goal

ทำให้ UAT เป็นส่วนหนึ่งของ project success และ quality measurement

## Tasks

### TASK-6.1 — Project Scoped UAT APIs

**Add project scoped endpoints**

```http
GET /projects/:projectId/uat/cycles
POST /projects/:projectId/uat/cycles
GET /projects/:projectId/uat/test-cases
POST /projects/:projectId/uat/test-cases
GET /uat/cycles/:id/results
POST /uat/cycles/:id/results
GET /uat/cycles/:id/comments
POST /uat/cycles/:id/comments
PATCH /uat/cycles/:id/comments/:commentId
```

**Acceptance Criteria**

- Project page จัดการ UAT ของ project ได้โดยตรง
- UAT data ไม่กระจัดกระจาย global list อย่างเดียว

---

### TASK-6.2 — UAT Defect to MIT / Task

**Description**

ให้ defect จาก UAT ถูกแปลงเป็นงานจริงได้

**Actions**

- Create MIT from UAT defect
- Create project task from UAT defect
- Link defect to existing MIT/task
- Mark defect resolved/closed

**Acceptance Criteria**

- UAT feedback ไม่หายเป็น comment ธรรมดา
- ทุก defect มี owner และ workflow ต่อ

---

### TASK-6.3 — UAT Quality Report

**Metrics**

- Test cases total
- Pass/fail/blocked/not executed
- Pass rate
- Open defects
- Critical/high defects
- Defect by module
- Defect aging
- Reopened defects
- UAT sign-off status

**Acceptance Criteria**

- Project manager รู้ว่า project พร้อม go-live หรือยัง
- ผู้บริหารเห็น quality risk ได้

---

# Phase 7 — Project Health & Success Metrics

## Goal

เพิ่มระบบวัดความสำเร็จของ project

## Tasks

### TASK-7.1 — Project Health Score

**Suggested Score Factors**

| Factor | Weight |
|---|---:|
| Schedule health | 25% |
| Task/MIT completion | 25% |
| Overdue / blocked work | 15% |
| UAT quality | 20% |
| Risk / issue / decision pending | 10% |
| Team workload pressure | 5% |

**Health Status**

```text
green
yellow
red
```

**Backend**

```http
GET /projects/:id/health
```

**Response**

```json
{
  "score": 78,
  "status": "yellow",
  "reasons": [
    "3 overdue MIT items",
    "5 open UAT defects",
    "UAT pass rate below 80%"
  ]
}
```

**Acceptance Criteria**

- Health score อธิบาย reason ได้
- ผู้บริหารดูแล้วรู้ว่า project เสี่ยงเพราะอะไร

---

### TASK-7.2 — Milestone & Baseline Tracking

**Description**

เพิ่ม baseline สำหรับ planned vs actual

**Suggested table**

`project_milestones`

Fields:

```text
id
projectId
name
description
plannedDate
actualDate
status
sortOrder
createdAt
updatedAt
```

**Metrics**

- milestone completion
- schedule variance
- late milestone count
- upcoming milestone

**Acceptance Criteria**

- Project มี timeline ที่วัดได้
- เห็น planned vs actual

---

### TASK-7.3 — Risk / Issue / Decision / Change Log

**Suggested tables**

- `project_risks`
- `project_issues`
- `project_decisions`
- `project_change_logs`

**Minimum fields**

```text
projectId
title
description
status
severity/impact
ownerUserId
dueDate
resolvedAt
createdAt
updatedAt
```

**Acceptance Criteria**

- Project มี log ที่ใช้ประชุม/ติดตามได้
- Decision pending ไม่หาย
- Change request กระทบ scope เห็นชัด

---

# Phase 8 — Performance Management

## Goal

ต่อยอดจาก workload report และ user performance monthly ให้ใช้วัด performance จริงได้

## Tasks

### TASK-8.1 — Performance Aggregation Job

**Description**

สร้าง job/service สำหรับคำนวณ performance จาก MIT/task/UAT/request จริง

**Input**

- MIT assignments
- MIT status history
- Project tasks
- UAT defects
- Overdue items
- Actual hours
- Completed items

**Output**

Update:

`user_performance_monthly`

**Metrics**

- assignedCount
- completedCount
- overdueCount
- avgResolutionHours
- totalActualHours
- cycleTime
- defectCount
- reopenCount
- handoffDelay
- onTimeCompletionRate

**Acceptance Criteria**

- Performance monthly ไม่ต้องกรอก manual
- Report มีข้อมูลจริงจาก workflow

---

### TASK-8.2 — Team Capacity & Utilization

**Suggested table**

`user_capacity_monthly`

Fields:

```text
userId
yearNo
monthNo
workingDays
availableHours
plannedHours
actualHours
utilizationPercent
```

**Acceptance Criteria**

- ดู workload เทียบ capacity ได้
- เห็นคน overload หรือว่างเกินไป
- ใช้วางแผน assignment ได้

---

### TASK-8.3 — Developer / QA / Fullstack Performance View

**Developer metrics**

- MIT completed
- cycle time DEV
- overdue rate
- reopen from QA/UAT
- PR merged

**QA metrics**

- test completed
- defects found
- QA cycle time
- defect escape rate

**Fullstack metrics**

- cross-step assignments
- completed across DEV/QA/UAT
- bottleneck reduction

**Acceptance Criteria**

- วัด performance ตามบทบาท ไม่ใช่ count อย่างเดียว
- ไม่ bias คนที่รับงานยากกว่า

---

# Phase 9 — Executive Reports

## Goal

สร้าง report สำหรับผู้บริหารที่ดู portfolio และตัดสินใจได้เร็ว

## Tasks

### TASK-9.1 — Executive Portfolio Dashboard

**Metrics**

- Total projects
- Active projects
- On hold projects
- Completed projects
- Cancelled projects
- Green/yellow/red health count
- Projects at risk
- Upcoming go-live
- Overdue projects
- Open UAT defects
- Blocked work
- Pending approvals

**Backend**

```http
GET /reports/executive/portfolio
```

**Acceptance Criteria**

- ผู้บริหารเห็นภาพรวมทุก project ในหน้าเดียว
- Drill down ไป project ได้

---

### TASK-9.2 — Project Success Report

**Per project metrics**

- Health score
- Progress %
- Planned vs actual
- MIT completion
- Task completion
- UAT pass rate
- Open defects
- Risks/issues
- Pending decisions
- Next milestone
- Go-live readiness

**Backend**

```http
GET /reports/projects/:id/success
```

**Acceptance Criteria**

- ใช้ประชุม weekly/monthly project review ได้
- Export ต่อได้ในอนาคต

---

### TASK-9.3 — Workload & Capacity Report

**Metrics**

- On hand by user
- On hand by project
- Waiting test
- Waiting UAT
- Overdue
- Pending handoff
- Capacity utilization
- Overload warning

**Acceptance Criteria**

- Manager เห็นคอขวดของทีม
- ใช้ปรับ assignment ได้

---

### TASK-9.4 — Delivery Performance Report

**Metrics**

- Lead time
- Cycle time
- Resolution time
- On-time completion rate
- Completed count trend
- Overdue trend
- Actual hours trend
- Throughput by month

**Acceptance Criteria**

- เห็น delivery trend ไม่ใช่แค่ snapshot
- ใช้ประเมิน process improvement ได้

---

### TASK-9.5 — Quality & UAT Report

**Metrics**

- Test pass rate
- Defect count by severity
- Defect count by module
- Reopen rate
- Blocked test cases
- UAT sign-off readiness
- Defect aging

**Acceptance Criteria**

- เห็น quality risk ก่อน go-live
- ใช้คุยกับ customer/stakeholder ได้

---

### TASK-9.6 — Request Intake Report

**Metrics**

- New requests
- Submitted requests
- Approved/rejected
- Linked to project
- Request type distribution
- Requester department/customer
- Request-to-project conversion rate
- Time to first response
- Time to approval

**Acceptance Criteria**

- เห็น demand ที่เข้า pipeline
- ใช้วางแผน capacity และ roadmap ได้

---

# Phase 10 — Team Center & Automation

## Goal

ทำให้ platform เป็น center ในทีมจริง ๆ ไม่ใช่แค่ dashboard

## Tasks

### TASK-10.1 — Action Inbox

**Description**

สร้าง inbox รวมสิ่งที่ user ต้องทำ

**Items**

- request waiting approval
- MIT waiting accept
- handoff pending
- task assigned to me
- overdue task
- UAT defect assigned
- decision pending
- project status needs update

**Backend**

```http
GET /me/action-inbox
```

**Acceptance Criteria**

- User เข้า platform แล้วรู้ทันทีว่าต้องทำอะไร
- ลดการไล่ถามใน chat

---

### TASK-10.2 — Notification Rules

**Triggers**

- task assigned
- MIT assigned
- handoff pending > X hours
- overdue task
- UAT defect created
- project health turns red
- go-live approaching
- pending approval > X days

**Channels**

- in-app
- email
- bot integration future

**Acceptance Criteria**

- ทีมไม่พลาดงานสำคัญ
- Manager เห็น risk เร็วขึ้น

---

### TASK-10.3 — Weekly Project Snapshot

**Description**

บันทึกสถานะ project ทุกสัปดาห์เพื่อดู trend

**Suggested table**

`project_weekly_snapshots`

Fields:

```text
projectId
weekStartDate
healthScore
healthStatus
progressPercent
openMitCount
completedMitCount
openTaskCount
completedTaskCount
openDefectCount
overdueCount
riskCount
note
createdAt
```

**Acceptance Criteria**

- เห็น trend ของ project health
- ใช้ทำ executive weekly report ได้

---

### TASK-10.4 — AI / Bot Assistant Extension

**Future Ideas**

- Convert request to project draft
- Generate MIT/task checklist from request description
- Summarize meeting into action items
- Generate weekly project report
- Detect project risk from overdue/defect trend
- Suggest assignee based on workload and role
- Summarize UAT defects by module

**Acceptance Criteria**

- ลด manual admin work
- ทำให้ platform เป็น assistant ของทีม

---

# Priority Recommendation

## Short Term — Highest Impact

1. Phase 0 — Product Boundary
2. Phase 1 — Project Workspace Foundation
3. Phase 5 — Project Tasks / Checklist
4. Phase 7.1 — Project Health Score
5. Phase 9.1 — Executive Portfolio Dashboard

## Medium Term

1. Phase 6 — UAT & Quality Management
2. Phase 8 — Performance Management
3. Phase 9 — Full Executive Reports
4. Phase 10.1 — Action Inbox

## Long Term

1. AI/Bot assistant
2. Weekly snapshots
3. Capacity planning
4. Advanced portfolio forecasting

---

# Suggested Development Order

```text
Sprint 1:
- Request vs Project boundary
- Simplify RequestActions
- Project progress summary API
- Project page overview

Sprint 2:
- Project tasks/checklist schema/API/UI
- Link task to MIT
- Assign task by module/feature

Sprint 3:
- Project-scoped UAT
- UAT defect to MIT/task
- Quality report

Sprint 4:
- Project health score
- Executive portfolio dashboard
- Project success report

Sprint 5:
- Performance aggregation
- Capacity/utilization
- Action inbox

Sprint 6:
- Weekly snapshot
- Notification
- AI assistant extension
```

---

# Definition of Done

This roadmap is successful when:

- Project page is the main command center.
- Request page is simplified to intake/progress/UAT feedback.
- Every project has measurable health.
- Every task/MIT/UAT defect has owner/status.
- Executives can see portfolio health without asking the team.
- Team members know what they need to do from action inbox.
- Reports are generated from real workflow data, not manual summary.

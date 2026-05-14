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

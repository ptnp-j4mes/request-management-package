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

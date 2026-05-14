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

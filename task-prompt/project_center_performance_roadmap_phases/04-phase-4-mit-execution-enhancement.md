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

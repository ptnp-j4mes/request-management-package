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

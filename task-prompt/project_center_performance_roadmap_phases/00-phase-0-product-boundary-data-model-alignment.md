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

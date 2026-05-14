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

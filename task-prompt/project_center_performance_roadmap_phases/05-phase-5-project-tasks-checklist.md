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

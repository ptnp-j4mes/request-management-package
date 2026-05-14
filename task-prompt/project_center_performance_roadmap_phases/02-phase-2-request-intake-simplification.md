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

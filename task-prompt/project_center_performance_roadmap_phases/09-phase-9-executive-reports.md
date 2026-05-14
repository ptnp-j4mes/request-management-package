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

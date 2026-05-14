# Phase 8 — Performance Management

## Goal

ต่อยอดจาก workload report และ user performance monthly ให้ใช้วัด performance จริงได้

## Tasks

### TASK-8.1 — Performance Aggregation Job

**Description**

สร้าง job/service สำหรับคำนวณ performance จาก MIT/task/UAT/request จริง

**Input**

- MIT assignments
- MIT status history
- Project tasks
- UAT defects
- Overdue items
- Actual hours
- Completed items

**Output**

Update:

`user_performance_monthly`

**Metrics**

- assignedCount
- completedCount
- overdueCount
- avgResolutionHours
- totalActualHours
- cycleTime
- defectCount
- reopenCount
- handoffDelay
- onTimeCompletionRate

**Acceptance Criteria**

- Performance monthly ไม่ต้องกรอก manual
- Report มีข้อมูลจริงจาก workflow

---

### TASK-8.2 — Team Capacity & Utilization

**Suggested table**

`user_capacity_monthly`

Fields:

```text
userId
yearNo
monthNo
workingDays
availableHours
plannedHours
actualHours
utilizationPercent
```

**Acceptance Criteria**

- ดู workload เทียบ capacity ได้
- เห็นคน overload หรือว่างเกินไป
- ใช้วางแผน assignment ได้

---

### TASK-8.3 — Developer / QA / Fullstack Performance View

**Developer metrics**

- MIT completed
- cycle time DEV
- overdue rate
- reopen from QA/UAT
- PR merged

**QA metrics**

- test completed
- defects found
- QA cycle time
- defect escape rate

**Fullstack metrics**

- cross-step assignments
- completed across DEV/QA/UAT
- bottleneck reduction

**Acceptance Criteria**

- วัด performance ตามบทบาท ไม่ใช่ count อย่างเดียว
- ไม่ bias คนที่รับงานยากกว่า

---

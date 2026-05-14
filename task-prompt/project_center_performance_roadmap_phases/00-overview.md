# Project Center & Performance Management Roadmap

Repo: `ptnp-j4mes/management-request-platform`

## Purpose

เอกสารนี้สรุปแนวทางพัฒนา platform ให้เป็นศูนย์กลางของทีมสำหรับการจัดการ Project, Request, MIT, UAT, Performance, Reporting และ Executive Dashboard

เป้าหมายหลักคือเปลี่ยนระบบจาก “ระบบติดตามงาน” ให้เป็น “Project Command Center” ที่วัดความสำเร็จของ project ได้จริง และช่วยให้ทีม/ผู้บริหารเห็นภาพรวมที่ชัดเจน

---

## Product Direction

### Current Direction

ระบบมี foundation ที่ดีอยู่แล้ว ได้แก่:

- Request intake
- Project management
- MIT workflow
- UAT cycle/test case/test result
- Workload report
- User performance monthly
- GitHub/project integration concept
- Meeting/bot integration concept

แต่ยังขาด layer สำคัญสำหรับ:

- Project success measurement
- Project task/checklist
- Executive dashboard
- Health score
- Risk/issue/change/decision tracking
- Performance aggregation
- Cross-project portfolio view

### Target Direction

ให้ `Project` เป็นศูนย์กลางของงานทั้งหมด

```text
Request = Intake / Approval / User Progress / UAT Feedback
Project = Workspace / Execution / Planning / Monitoring / Reporting
MIT     = Technical execution item
Task    = Project checklist / feature/module work item
UAT     = Acceptance and quality validation
Report  = Management and executive visibility
```

---

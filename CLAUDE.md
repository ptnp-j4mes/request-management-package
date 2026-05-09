# CLAUDE.md — Request Management Platform

## Project Overview

Internal enterprise platform สำหรับจัดการ Project, Request, UAT, Bug/Change Tracking, MIT workflow, Meeting Bot และ Gemini AI Summary

**Repository:** `/Users/bic-patanaphong/Documents/GitHub/request-management-project`
**Git remote:** `https://github.com/ptnp-j4mes/request-management-package`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun 1.3+ |
| Frontend | Next.js 14 App Router + Tailwind + TanStack Query |
| Backend | Elysia.js 1.4 |
| Database | PostgreSQL 16 + Drizzle ORM |
| Validation | Zod |
| Auth | JWT (access 15m + refresh 7d) via @elysiajs/jwt |
| Password | `Bun.password.hash()` / `Bun.password.verify()` — no bcrypt |
| Meeting Bot | Python 3.10 + Playwright + Gemini 1.5 Pro |
| Container | Docker + docker-compose |

---

## Monorepo Structure

```
apps/
  api/              Elysia.js backend (port 9898)
  web/              Next.js frontend (port 9899 → container 3000)
  meeting-bot/      Python worker: Playwright bot + Gemini summary

packages/
  db/               Drizzle schema, migrations, seed
  types/            Shared Zod enums + TypeScript types
  ui/               Shared UI components
  config/           Shared tsconfig / eslint
  utils/            Helper functions

infra/
  docker/           Dockerfile.api, Dockerfile.web
  nginx/            Reverse proxy config
  scripts/          Setup scripts
```

---

## How to Run

### Docker (recommended)

```bash
cp .env.example .env
# Set GEMINI_API_KEY in .env for meeting bot summarization

docker-compose up -d postgres
docker exec -i rm_postgres psql -U rmuser -d requestdb < packages/db/drizzle/0000_needy_moon_knight.sql
docker exec -i rm_postgres psql -U rmuser -d requestdb < packages/db/drizzle/0001_auth_rbac.sql
docker exec -i rm_postgres psql -U rmuser -d requestdb < packages/db/drizzle/0002_request_workflow.sql
docker exec -i rm_postgres psql -U rmuser -d requestdb < packages/db/drizzle/0003_meeting_bot.sql
bun run db:seed

docker-compose up -d api web meeting-bot
```

### Rebuild & restart API after code changes

```bash
docker-compose build api && docker stop rm_api && docker rm rm_api && docker-compose up -d api
```

### Rebuild meeting-bot

```bash
docker-compose build meeting-bot && docker-compose up -d meeting-bot
```

### Local dev (no Docker)

```bash
bun install
docker-compose up -d postgres   # DB only
bun run db:migrate && bun run db:seed
cd apps/api && bun run dev       # port 9898
cd apps/web && bun run dev       # port 9899
```

### DB commands

```bash
bun run db:generate    # generate migration from schema
bun run db:migrate     # apply migrations (use docker exec instead if unreliable)
bun run db:seed        # seed demo data
bun run db:studio      # open Drizzle Studio
```

---

## Environment Variables (.env)

```env
DATABASE_URL=postgresql://rmuser:rmpassword@localhost:65432/requestdb
API_PORT=9898
API_HOST=0.0.0.0
JWT_SECRET=change-me-in-production
JWT_REFRESH_SECRET=change-me-refresh-in-production
CORS_ORIGIN=http://localhost:9899
NEXT_PUBLIC_API_URL=http://localhost:9898
GEMINI_API_KEY=your-gemini-api-key-here
MEETING_BOT_POLL_INTERVAL=60
MEETING_BOT_HEADLESS=false
```

---

## Seed Users (password: `password123`)

| User | Email | Roles | Department |
|---|---|---|---|
| alice | alice@example.com | DEVELOPER, FULLSTACK | IT |
| bob | bob@example.com | QA | IT |
| carol | carol@example.com | REQUESTER, APPROVER | FINANCE |
| dan | dan@example.com | IT_MANAGER, ADMIN | MANAGEMENT |

---

## Database Schema

### Auth & Users
| Table | Key Columns |
|---|---|
| `departments` | id, code, name |
| `roles` | id, code (ADMIN/REQUESTER/…), name |
| `users` | id, email, password_hash, department_id, is_active |
| `user_roles` | user_id, role_id (composite PK) |

### Projects
| Table | Key Columns |
|---|---|
| `projects` | id, project_code, project_name, status |
| `project_members` | project_id, user_id, member_role (composite PK) |

### Requests (workflow-enabled)
| Table | Key Columns |
|---|---|
| `requests` | id, request_no, project_id, requester_user_id, approver_id, ba_owner_id, dev_owner_id, qa_owner_id, status, submitted_at, approved_at, completed_at |
| `request_comments` | id, request_id, created_by, comment_text |
| `request_status_history` | id, request_id, old_status, new_status, changed_by, remark |
| `request_bugs` | request_id (PK), severity, root_cause, fix_version |
| `request_changes` | request_id (PK), change_category, approved_flag |
| `request_attachments` | id, request_id, file_name, file_path |

### MIT (Managed Item Tracking)
| Table | Key Columns |
|---|---|
| `workflow_definitions` | id, name, is_default |
| `workflow_steps` | id, workflow_id, step_code, step_order, is_terminal |
| `mit_items` | id, mit_no, project_id, request_id, status, current_step_code, current_owner_user_id *(snapshot fields)* |
| `mit_step_assignments` | id, mit_item_id, step_id, assigned_user_id, assignment_status |
| `mit_handoffs` | id, mit_item_id, from_step_id, to_step_id, handoff_status |
| `mit_acceptance_logs` | id, assignment_id, action, remark |
| `mit_status_history` | id, mit_item_id, old_status, new_status |

### UAT & Maintenance
| Table | Key Columns |
|---|---|
| `uat_cycles` | id, project_id, status |
| `uat_test_cases` | id, project_id, title |
| `uat_test_results` | id, uat_cycle_id, test_case_id, result |
| `maintenance_agreements` | id, project_id, ma_type, start_date, end_date, status |

### Meeting Bot
| Table | Key Columns |
|---|---|
| `google_bot_accounts` | id, email, current_status (AVAILABLE/IN_MEETING/…), is_default |
| `google_bot_account_sessions` | id, google_bot_account_id, session_status, requires_relogin |
| `project_meeting_settings` | id, project_id (UNIQUE), meeting_bot_enabled, sync_mode, summary_pattern |
| `project_meetings` | id, project_id, title, start_at, bot_status, recording_status, summary_status, transcript_text, summary_markdown |
| `meeting_bot_logs` | id, meeting_id, level, message, metadata (jsonb) |
| `meeting_action_items` | id, meeting_id, title, owner_name, due_date, status |

### Chat Bot (separate from meeting bot)
| Table | Key Columns |
|---|---|
| `bot_channels` | id, channel_code |
| `bot_sessions` | id, project_id, user_id, channel_id |
| `bot_messages` | id, session_id, message_text |
| `bot_requests` / `bot_responses` | payload-based request tracking |

---

## Migration Files

| File | Contents |
|---|---|
| `0000_needy_moon_knight.sql` | Initial schema (all base tables) |
| `0001_auth_rbac.sql` | departments, roles, user_roles; ADD COLUMN password_hash/department_id to users |
| `0002_request_workflow.sql` | ADD COLUMN submitted_at, approved_at, completed_at, approver_id, ba_owner_id, dev_owner_id, qa_owner_id to requests |
| `0003_meeting_bot.sql` | google_bot_accounts, google_bot_account_sessions, project_meeting_settings, project_meetings, meeting_bot_logs, meeting_action_items |

> ⚠️ Drizzle's migrate() has been unreliable — always apply via `docker exec -i rm_postgres psql -U rmuser -d requestdb < file.sql`

---

## API Endpoints

All endpoints require `Authorization: Bearer <token>` except `/auth/login` and `/auth/refresh`.

### Auth
```
POST /auth/login          { email, password } → { accessToken, user }
POST /auth/refresh        { refreshToken } → { accessToken }
GET  /auth/me             → { id, email, roles, department }
POST /auth/logout         → { loggedOut: true }
```

### Users
```
GET    /users             IT_MANAGER, ADMIN
POST   /users             ADMIN
PATCH  /users/:id         ADMIN
```

### Projects
```
GET    /projects
GET    /projects/:id
POST   /projects          IT_MANAGER, ADMIN
PATCH  /projects/:id      IT_MANAGER, ADMIN
POST   /projects/:id/members
DELETE /projects/:id/members/:userId
```

### Requests (workflow)
```
GET    /requests
GET    /requests/:id
POST   /requests
PATCH  /requests/:id      APPROVER, BA, IT_MANAGER, ADMIN
POST   /requests/:id/comments
GET    /requests/:id/comments

# Workflow transitions
POST   /requests/:id/submit          (requester only)
POST   /requests/:id/approve         APPROVER, IT_MANAGER, ADMIN
POST   /requests/:id/reject          APPROVER, BA, QA, IT_MANAGER, ADMIN
POST   /requests/:id/assign-ba       IT_MANAGER, ADMIN  { baUserId }
POST   /requests/:id/assign-dev      IT_MANAGER, ADMIN  { devUserId }
POST   /requests/:id/assign-qa       IT_MANAGER, ADMIN  { qaUserId }
POST   /requests/:id/start-development   DEVELOPER, FULLSTACK (must be devOwner)
POST   /requests/:id/ready-for-qa        DEVELOPER, FULLSTACK (must be devOwner)
POST   /requests/:id/qa-pass             QA (must be qaOwner)
POST   /requests/:id/qa-fail             QA (must be qaOwner)  { reason }
POST   /requests/:id/uat-approve         REQUESTER (must own), APPROVER, IT_MANAGER, ADMIN
POST   /requests/:id/close               IT_MANAGER, ADMIN
```

### Request Workflow Status Flow
```
draft → submitted → manager_approved → ba_review → waiting_estimate
→ assigned_to_dev → in_development → ready_for_qa → in_qa → uat → completed
                                                                  ↘ closed (any time by IT_MANAGER)
Any state → rejected / cancelled
```

### MIT Items
```
GET    /mit-items
GET    /mit-items/:id
POST   /mit-items
POST   /mit-items/:id/assign
POST   /mit-items/:id/accept
POST   /mit-items/:id/reject
POST   /mit-items/:id/return
POST   /mit-items/:id/submit
POST   /mit-items/:id/deploy
```

### UAT, MA, Workload, Performance
```
GET/POST /uat/cycles, /uat/test-cases, /uat/results
GET/POST /maintenance-agreements
GET      /workload/by-user, /workload/by-project, /workload/overdue, /workload/handoffs/pending
GET      /performance/monthly
```

### Meeting Bot
```
GET  /projects/:id/meeting-settings
PUT  /projects/:id/meeting-settings      IT_MANAGER, ADMIN

GET    /projects/:id/meetings
POST   /projects/:id/meetings            IT_MANAGER, BA, ADMIN  { title, startAt, endAt, meetingUrl }
GET    /projects/:id/meetings/:meetingId
PUT    /projects/:id/meetings/:meetingId IT_MANAGER, BA, ADMIN
DELETE /projects/:id/meetings/:meetingId IT_MANAGER, ADMIN

POST /projects/:id/meetings/:meetingId/sync-to-google     (stub)
POST /projects/:id/meetings/:meetingId/sync-from-google   (stub)
POST /projects/:id/meetings/:meetingId/resolve-conflict   { resolveAs: "PROJECT"|"GOOGLE" }

POST /projects/:id/meetings/:meetingId/bot-join-now       (stub)
POST /projects/:id/meetings/:meetingId/transcribe         (stub)
POST /projects/:id/meetings/:meetingId/summarize          { transcriptText? }
GET  /projects/:id/meetings/:meetingId/summary

GET    /projects/:id/meetings/:meetingId/action-items
POST   /projects/:id/meetings/:meetingId/action-items     { title, ownerName, dueDate }
PATCH  /projects/:id/meetings/:meetingId/action-items/:itemId
DELETE /projects/:id/meetings/:meetingId/action-items/:itemId

GET    /google-bot-accounts              ADMIN
POST   /google-bot-accounts              ADMIN
GET    /google-bot-accounts/:id          ADMIN
PUT    /google-bot-accounts/:id          ADMIN
DELETE /google-bot-accounts/:id          ADMIN (soft delete)
POST   /google-bot-accounts/:id/login           ADMIN (stub)
POST   /google-bot-accounts/:id/health-check    ADMIN (stub)
POST   /google-bot-accounts/:id/set-default     ADMIN
POST   /google-bot-accounts/:id/disable         ADMIN
```

---

## RBAC Roles

```
ADMIN         full access to everything
IT_MANAGER    manage projects, assign, close, bot settings
APPROVER      approve/reject requests in own department
BA            analyze, assign, scope requests
DEVELOPER     update development status on assigned items
FULLSTACK     same as DEVELOPER + broader scope
QA            create QA results on assigned items
REQUESTER     create requests, confirm UAT for own requests
```

---

## Key Patterns & Gotchas

### Elysia Auth Middleware Scoping
```ts
// WRONG: authenticate hooks are local-only by default
.derive(async ({ jwt, headers }) => { ... })
.onBeforeHandle(({ user, set }) => { ... })

// CORRECT: { as: "scoped" } propagates to parent router
.derive({ as: "scoped" }, async ({ jwt, headers }: any) => { ... })
.onBeforeHandle({ as: "scoped" }, ({ user, set }: any) => { ... })
```

### Scoped Sub-router for Partial Guards
```ts
// Wrap only the protected route in an inner Elysia so the guard
// doesn't bleed onto subsequent routes in the outer router
.use(
  new Elysia()
    .use(authorize(["ADMIN"]))
    .patch("/:id", handler)
)
.post("/:id/other-action", otherHandler)  // not behind the guard
```

### Drizzle Timestamp Columns
Drizzle expects `Date` objects for `timestamp` columns — always convert ISO strings from request body:
```ts
startAt: new Date(body.startAt),
endAt: body.endAt ? new Date(body.endAt) : undefined,
```

### psycopg2 Thread Safety
Python worker: psycopg2 connections are NOT thread-safe. Each thread must create its own connection via `conn_factory()`.

### Meeting Bot — Google Session
First-time login for a bot account must be done manually:
```bash
docker exec -it rm_meeting_bot python -c "
from meet_bot import join_meeting
join_meeting('https://meet.google.com/test', 'bot@company.com')
input('Log in manually, then press Enter...')
"
```
The persistent browser profile at `/app/bot_profiles/<email>/` stores the session.

---

## Python Meeting Bot Worker

Location: `apps/meeting-bot/`

```
main.py           — entrypoint, wait for DB, start scheduler
scheduler.py      — poll loop: join meetings + summarize
db.py             — all SQL queries (psycopg2 + RealDictCursor)
account_selector.py — pick bot account by LEAST_BUSY/ROUND_ROBIN/DEFAULT
meet_bot.py       — Playwright: join Meet, mute, wait, leave
recorder.py       — ffmpeg audio capture + Gemini transcription
gemini_summary.py — Gemini 1.5 Pro summarize + action item extraction
config.py         — env var loading
bot_profiles/     — gitignored; per-account Chrome persistent profiles
```

**Scheduler lifecycle per meeting:**
1. Find `bot_status='SCHEDULED'` meetings within `auto_join_before_minutes`
2. Select bot account (LEAST_BUSY policy default)
3. `WAITING_TO_JOIN → JOINING → IN_MEETING` (Playwright)
4. Wait until `end_at + auto_leave_after_minutes`
5. `LEFT` — release bot account back to AVAILABLE
6. If `transcript_text` set → call Gemini → `COMPLETED` + insert action items

**Summarize trigger (without bot join):**
Set `summary_status='SUMMARIZING'` and `transcript_text` via API or direct SQL → worker picks it up on next poll.

---

## Docker Containers

| Container | Image | Port |
|---|---|---|
| `rm_postgres` | postgres:16-alpine | 65432→5432 |
| `rm_api` | request-management-project-api | 9898 |
| `rm_web` | request-management-project-web | 9899→3000 |
| `rm_meeting_bot` | request-management-project-meeting-bot | — |

Internal Docker network — services reference each other by service name (`postgres`, `api`).

---

## Frontend Structure

```
apps/web/
  app/
    (auth)/login/     login page
    admin/            admin panel
    bot/              chat bot sessions
    ma/               maintenance agreements
    mit/              MIT workflow items
    performance/      workload metrics
    projects/         project list + detail
    requests/         request list + detail + create
    uat/              UAT cycles
    workload/         workload dashboard
  components/
    layout/           Sidebar (user info + logout), Providers
    mit/              WorkflowActionSheet
    ui/               Badge, cn utility
  contexts/
    AuthContext.tsx   JWT token storage (localStorage + cookie dual-write)
  lib/
    api.ts            Bearer token injection + 401 redirect
  middleware.ts       Edge middleware: redirect to /login if no rm_token cookie
```

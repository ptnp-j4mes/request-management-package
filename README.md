# Request Management Platform

Internal enterprise workflow platform for Project, Request, UAT, Bug Tracking, MA Coverage, MIT-based work execution, workload reporting, and bot-assisted intake.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Bun |
| Frontend | Next.js 14 App Router + shadcn/ui + TanStack Query |
| Backend | Elysia.js |
| Database | PostgreSQL + Drizzle ORM |
| Validation | Zod |
| Container | Docker |

## Repository Structure

```
apps/
  web/       Next.js frontend
  api/       Elysia.js backend

packages/
  db/        Drizzle schema, migrations, seed, repositories
  types/     Shared Zod schemas and TypeScript types
  ui/        Shared UI component wrappers
  config/    Shared tsconfig and eslint configs
  utils/     Shared helper functions

infra/
  docker/    Dockerfiles per service
  nginx/     Reverse proxy config
  scripts/   Setup and migration scripts
```

## Local Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.1
- [Docker](https://docker.com) >= 24

### 1. Clone and install

```bash
git clone <repo-url>
cd request-management-project
cp .env.example .env
bun install
```

### 2. Start PostgreSQL

```bash
docker compose up postgres -d
```

### 3. Run migrations and seed

```bash
bun run db:migrate
bun run db:seed
```

### 4. Start development servers

```bash
# Terminal 1 – API
cd apps/api && bun run dev

# Terminal 2 – Web
cd apps/web && bun run dev
```

Open [http://localhost:3000](http://localhost:3000)

API base: [http://localhost:3001](http://localhost:3001)

### Full Docker environment

```bash
docker compose up --build
```

## Default Workflow

The seed data includes a default workflow:

```
DEV (order 1) → QA (order 2) → UAT (order 3) → MA (order 4, terminal)
```

## Workload Queue Definitions

| Queue | Condition |
|---|---|
| On Hand | `current_status` in `assigned`, `accepted`, `in_progress`, `testing`, `uat_in_progress` |
| Waiting Test | `current_step_code = QA` AND status in `assigned`, `waiting_test`, `accepted`, `testing` |
| Waiting UAT | `current_step_code = UAT` AND status in `assigned`, `waiting_uat`, `accepted`, `uat_in_progress` |
| Deployed | `current_status = deployed` |

## Key API Endpoints

```
GET    /health
GET    /projects
POST   /projects
GET    /requests?projectId=&type=&status=&page=&limit=
POST   /requests
POST   /mit-items/:id/assign
POST   /mit-items/:id/accept
POST   /mit-items/:id/submit
POST   /mit-items/:id/return
GET    /workload/by-user
GET    /workload/by-project
GET    /workload/overdue
GET    /workload/handoffs/pending
```

## Database Commands

```bash
bun run db:generate   # Generate migration from schema changes
bun run db:migrate    # Apply migrations
bun run db:seed       # Seed demo data
bun run db:studio     # Open Drizzle Studio
```

# Help Desk Rostering

A help desk rostering application for managing student tutors, shift scheduling, and payroll. Built as a monorepo with a Go backend, React frontend, and Python microservices.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.24, Chi router, Go-Jet v2, PostgreSQL 16 (RLS) |
| Frontend | React 19, TypeScript, TanStack Router, Tailwind CSS 4, shadcn/ui |
| Scheduler | Python, FastAPI, PuLP (LP solver) |
| Transcripts | Python, FastAPI, pdfplumber |
| Infrastructure | Docker Compose, Air (hot reload), Mailpit (dev email), Resend (prod email) |

## Quick Start

```bash
# 1. Install Task runner (pick one)
brew install go-task/tap/go-task          # macOS (Homebrew)
sudo snap install task --classic          # Linux (Snap)
winget install Task.Task                  # Windows (WinGet)
npm install -g @go-task/cli              # Any OS (npm)

# 2. Install Go tools
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/go-jet/jet/v2/cmd/jet@latest

# 3. Start everything (database, services, migrations, seed data)
task db:reset
```

### Services

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080 |
| Mailpit (email UI) | http://localhost:8025 |
| PostgreSQL | localhost:5432 (`helpdesk` / `helpdesk_local`) |
| Scheduler | :8000 (internal) |
| Transcripts | :8001 (internal) |

## Commands

| Command | Description |
|---------|-------------|
| `task start` | Start all services |
| `task stop` | Stop all services |
| `task logs` | Tail service logs |
| `task db:reset` | Drop, recreate, migrate, restart, and seed |
| `task db:seed` | Seed dev data (requires running backend) |
| `task db:studio` | Open Drizzle Studio |
| `task migrate:up` | Run pending migrations |
| `task migrate:down` | Rollback last migration |
| `task migrate:create -- name` | Create new migration |
| `task generate:models` | Regenerate Go-Jet models from schema |
| `task test` | Run all tests |
| `task visualize` | Show shifts, schedules, and availability |

## Project Structure

```
├── apps/
│   ├── backend/           # Go REST API (DDD)
│   ├── frontend/          # React SPA
│   ├── scheduler/         # Python — LP schedule optimizer
│   └── transcripts/       # Python — PDF transcript parser
├── migrations/            # SQL migrations (golang-migrate)
├── scripts/               # seed_dev.sh, visualize.sh
├── docker-compose.local.yml
├── Taskfile.yml
└── DEVELOPMENT.md         # Architecture & development guide
```

## Documentation

| Document | Description |
|----------|-------------|
| [DEVELOPMENT.md](DEVELOPMENT.md) | System architecture, data flows, database schema, dev workflow |
| [apps/backend/README.md](apps/backend/README.md) | Backend API reference, tech stack, project structure |
| [apps/backend/DEVELOPMENT.md](apps/backend/DEVELOPMENT.md) | Backend DDD patterns, transaction manager, adding domains |
| [apps/frontend/DEVELOPMENT.md](apps/frontend/DEVELOPMENT.md) | Frontend patterns, routing, forms, adding features |
| [apps/scheduler/README.md](apps/scheduler/README.md) | Scheduler API, request/response format, config tuning |
| [apps/transcripts/README.md](apps/transcripts/README.md) | Transcript extraction API, response format, how parsing works |

## Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+ & pnpm
- [Task](https://taskfile.dev/) — task runner

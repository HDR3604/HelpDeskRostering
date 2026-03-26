# Help Desk Rostering

A help desk rostering application for managing student tutors, shift scheduling, clock-in/out attendance tracking, and payroll. Built as a monorepo with a Go backend, React frontend, and Python microservices.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.25, Chi router, Go-Jet v2, PostgreSQL 16 (RLS), River (job queue) |
| Frontend | React 19, TypeScript, TanStack Router, Tailwind CSS 4, shadcn/ui |
| Scheduler | Python, FastAPI, PuLP (LP solver) |
| Transcripts | Python, FastAPI, pdfplumber |
| Infrastructure | Docker Compose, Air (hot reload), Mailpit (dev email), Resend (prod email) |

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- [Go 1.24+](https://go.dev/dl/)
- [Node.js 20+](https://nodejs.org/) & [pnpm](https://pnpm.io/)
- [Task](https://taskfile.dev/) — task runner
- [goose](https://github.com/pressly/goose) — database migrations

### Installing Task

```bash
brew install go-task/tap/go-task          # macOS (Homebrew)
sudo snap install task --classic          # Linux (Snap)
winget install Task.Task                  # Windows (WinGet)
npm install -g @go-task/cli              # Any OS (npm)
```

### Installing Go tools

```bash
go install github.com/pressly/goose/v3/cmd/goose@latest
go install github.com/go-jet/jet/v2/cmd/jet@latest
```

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/HDR3604/HelpDeskRostering.git
cd HelpDeskRostering

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env — at minimum set:
#   POSTGRES_PASSWORD, JWT_SECRET (32+ chars), ENCRYPTION_KEY, FRONTEND_URL, FROM_EMAIL

# 3. Start everything (database, services, migrations, seed data)
task db:reset
```

This starts all services, runs migrations, and seeds dev data. The application is then available at:

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8080/api/v1 |
| Mailpit (email UI) | http://localhost:8025 |
| PostgreSQL | localhost:5432 (`helpdesk` / `helpdesk_local`) |
| Scheduler | :8000 (internal) |
| Transcripts | :8001 (internal) |

### Seeding an admin user

```bash
task db:seed-admin -- "Admin" "User" "admin@example.com" "your-password"
```

Or set the `SEED_ADMIN_*` variables in `.env` to auto-seed on startup.

## Local Development (without Docker)

For developing individual services outside of Docker:

### Database only

```bash
task db:start       # Start PostgreSQL via Docker
task migrate:up     # Apply migrations
```

### Backend

```bash
task install:backend
cd apps/backend
go run cmd/server/main.go
```

### Frontend

```bash
task install:frontend
cd apps/frontend
pnpm dev
```

### Scheduler

```bash
cd apps/scheduler
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Transcripts

```bash
cd apps/transcripts
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

## Commands

| Command | Description |
|---------|-------------|
| `task start` | Start all services |
| `task stop` | Stop all services |
| `task logs` | Tail service logs |
| `task test` | Run all tests (backend, scheduler, transcripts) |
| `task test:backend` | Run backend tests (unit + integration with testcontainers) |
| `task test:backend:unit` | Run backend unit tests only |
| `task test:backend:fresh` | Clear cache and re-run backend tests |
| `task test:frontend` | Run frontend tests |
| `task db:reset` | Drop, recreate, migrate, restart, and seed |
| `task db:seed` | Seed dev data (requires running backend) |
| `task db:studio` | Open Drizzle Studio (DB browser) |
| `task migrate:up` | Run pending migrations |
| `task migrate:down` | Rollback last migration |
| `task migrate:status` | Show migration status |
| `task migrate:create -- name` | Create new migration |
| `task generate:models` | Regenerate Go-Jet models from DB schema |
| `task format` | Format all code (Go + TypeScript) |
| `task visualize` | Show shifts, schedules, and availability |

## Environment Variables

Copy `.env.example` to `.env` and configure. Key variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `DATABASE_URL` | Yes | Full PostgreSQL connection string |
| `JWT_SECRET` | Yes | JWT signing key (min 32 characters) |
| `ENCRYPTION_KEY` | Yes | AES encryption key for sensitive data |
| `FRONTEND_URL` | Yes | Frontend URL for email links |
| `FROM_EMAIL` | Yes | Sender email address |
| `RESEND_API_KEY` | Prod | Resend API key for production email |
| `HELPDESK_LONGITUDE` | No | Help desk longitude (defaults to UWI St Augustine) |
| `HELPDESK_LATITUDE` | No | Help desk latitude (defaults to UWI St Augustine) |
| `RATE_LIMIT_RPM` | No | Requests per minute per IP for public routes (default: 30) |
| `SEED_ADMIN_*` | No | Auto-seed an admin user on startup |

See [.env.example](.env.example) for the full list.

## Production Deployment

The production compose file (`docker-compose.yml`) runs all services with optimized Dockerfiles (multi-stage builds, no hot reload, no volume mounts). Services communicate internally — only a reverse proxy needs to be exposed.

### 1. Configure environment

```bash
cp .env.example .env
```

Set all required variables with production values:

```bash
ENVIRONMENT=production
POSTGRES_PASSWORD=<strong-random-password>
JWT_SECRET=<random-string-32+-chars>
ENCRYPTION_KEY=<random-string-32-chars>
FRONTEND_URL=https://yourdomain.com
FROM_EMAIL=noreply@yourdomain.com
RESEND_API_KEY=re_...                    # Resend API key for email delivery
HELPDESK_LONGITUDE=-61.277001            # Your help desk location
HELPDESK_LATITUDE=10.642707
RATE_LIMIT_RPM=30
VITE_API_BASE_URL=https://yourdomain.com
```

### 2. Build and start

```bash
docker compose up -d --build
```

### 3. Run migrations

```bash
# From a machine with goose installed and network access to the DB:
goose -dir migrations postgres "postgres://USER:PASS@HOST:5432/helpdesk?sslmode=require" up
```

Or exec into the running backend container:

```bash
docker compose exec backend /bin/sh
# Migrations are baked into the image at /migrations
goose -dir /migrations postgres "$DATABASE_URL" up
```

### 4. Seed admin user

```bash
docker compose exec backend /app/server  # The backend auto-seeds if SEED_ADMIN_* env vars are set
```

Or set the seed variables in `.env` before starting:

```bash
SEED_ADMIN_FIRST_NAME=Admin
SEED_ADMIN_LAST_NAME=User
SEED_ADMIN_EMAIL=admin@yourdomain.com
SEED_ADMIN_PASSWORD=<strong-password>
```

### 5. Reverse proxy

The production compose exposes services on internal ports only (no `ports:` mapping). Place a reverse proxy (Nginx, Caddy, Traefik) in front:

| Route | Target |
|-------|--------|
| `/api/*` | `backend:8080` |
| `/*` | `frontend:5173` |

Example Caddy config:

```
yourdomain.com {
    handle /api/* {
        reverse_proxy backend:8080
    }
    handle {
        reverse_proxy frontend:5173
    }
}
```

### Production checklist

- [ ] Strong `POSTGRES_PASSWORD`, `JWT_SECRET`, `ENCRYPTION_KEY` (use `openssl rand -base64 32`)
- [ ] `ENVIRONMENT=production` (disables dev auth bypass)
- [ ] `RESEND_API_KEY` configured for email delivery
- [ ] `FRONTEND_URL` matches your actual domain (used in email links)
- [ ] `HELPDESK_LONGITUDE` / `HELPDESK_LATITUDE` set to your help desk location
- [ ] Reverse proxy with TLS termination in front of Docker services
- [ ] PostgreSQL volume backed up regularly (`postgres_data`)
- [ ] Rate limiting configured (`RATE_LIMIT_RPM`, default 30)

## Project Structure

```
HelpDeskRostering/
├── apps/
│   ├── backend/           # Go REST API (DDD) with River job queue
│   ├── frontend/          # React SPA
│   ├── scheduler/         # Python — LP schedule optimizer
│   └── transcripts/       # Python — PDF transcript parser
├── migrations/            # SQL migrations (goose)
├── scripts/               # seed_dev.sh, visualize.sh
├── docker-compose.yml     # Production compose
├── docker-compose.local.yml  # Local development compose
└── Taskfile.yml           # Task runner commands
```

## Testing

```bash
task test                  # All tests
task test:backend          # Backend (unit + integration)
task test:backend:unit     # Backend unit tests only
task test:frontend         # Frontend tests
```

Integration tests spin up isolated PostgreSQL containers via [testcontainers-go](https://golang.testcontainers.org/) — no external database required.

## Documentation

| Document | Description |
|----------|-------------|
| [apps/backend/README.md](apps/backend/README.md) | Backend API reference, endpoints, project structure |
| [apps/backend/DEVELOPMENT.md](apps/backend/DEVELOPMENT.md) | Backend DDD patterns, transaction manager, adding domains |
| [apps/frontend/DEVELOPMENT.md](apps/frontend/DEVELOPMENT.md) | Frontend patterns, routing, forms, adding features |
| [apps/scheduler/README.md](apps/scheduler/README.md) | Scheduler API, request/response format, config tuning |
| [apps/transcripts/README.md](apps/transcripts/README.md) | Transcript extraction API, response format, how parsing works |

# Help Desk Rostering

A help desk and rostering application built with Go and React.

## Quick Start

```bash
# 1. Install global tools (one-time)
-- Installing go.Task --
brew install go-task/tap/go-task (Linux)
winget install Task.Task (Windows)
npm install -g @go-task/cli (Cross-Platform)
----
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/go-jet/jet/v2/cmd/jet@latest

# 2. Start the database and run migrations
task start
task migrate:up

# 3. Generate models (after migrations)
task generate:models

```

**Services:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- Scheduler: http://localhost:8000
- Transcript Extraction: http://localhost:8001
- Database: localhost:5432

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go 1.24, PostgreSQL 16, go-jet |
| Frontend | React 19, TypeScript, TanStack Router, Tailwind CSS |
| Infrastructure | Docker, Docker Compose, Air (hot reload) |

## Prerequisites

- Docker & Docker Compose
- Go 1.24+
- Node.js 20+ & pnpm
- [Task](https://taskfile.dev/) - task runner

## Commands

### Docker

| Command | Description |
|---------|-------------|
| `task start` | Start all services (with hot reload) |
| `task stop` | Stop all services |
| `task logs` | View service logs |

### Database

| Command | Description |
|---------|-------------|
| `task db:start` | Start PostgreSQL only |
| `task db:studio` | Open Drizzle Studio (database viewer) |
| `task migrate:up` | Run pending migrations |
| `task migrate:down` | Rollback last migration |
| `task migrate:reset` | Rollback all migrations |
| `task migrate:create -- name` | Create new migration |
| `task generate:models` | Generate Go models from schema |

### Build & Test

| Command | Description |
|---------|-------------|
| `task build` | Build all projects |
| `task test` | Run all tests |
| `task test:backend` | Run backend tests |
| `task test:scheduler` | Run scheduler tests |
| `task test:transcript` | Run transcript extraction tests |
| `task test:frontend` | Run frontend tests |

## Database Connection

```
Host: localhost
Port: 5432
User: helpdesk
Password: helpdesk_local
Database: helpdesk
```

## Project Structure

```
├── apps/
│   ├── backend/                     # Go REST API
│   │   ├── cmd/server/              # Entry point
│   │   └── internal/
│   │       ├── application/         # App config & routes
│   │       ├── domain/              # Business logic
│   │       ├── infrastructure/      # Database, models, external services
│   │       └── tests/               # Unit & integration tests
│   ├── frontend/                    # React SPA (TanStack Router, Tailwind)
│   ├── scheduler/                   # Python FastAPI — schedule optimizer (PuLP)
│   └── transcripts/                    # Python FastAPI — PDF transcript parser
├── migrations/                      # SQL migrations (golang-migrate)
├── docker-compose.local.yml         # Local dev services
└── Taskfile.yml                     # Task definitions
```

## Database Schema

### Tables

#### `auth.students`
Student applicants and employees.

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | int | Primary key (student number) |
| `email_address` | varchar(255) | Unique email |
| `first_name` | varchar(50) | |
| `last_name` | varchar(100) | |
| `phone_number` | varchar(20) | Optional phone number |
| `transcript_metadata` | jsonb | Extracted transcript data (GPA, courses, current_level) |
| `availability` | jsonb | Weekly availability `{day: [hours]}` |
| `min_weekly_hours` | float | Scheduler: minimum hours target |
| `max_weekly_hours` | float | Scheduler: maximum hours allowed |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |
| `accepted_at` | timestamptz | Application accepted |
| `rejected_at` | timestamptz | Application rejected |
| `deleted_at` | timestamptz | Soft delete |

#### `auth.users`
Admin accounts for system access.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Primary key |
| `email_address` | varchar(255) | Unique email |
| `password` | varchar(255) | Hashed password |
| `role` | auth.roles | `student` or `admin` |
| `is_active` | boolean | Account enabled |
| `email_verified_at` | timestamptz | Email verification timestamp (NULL = unverified) |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

#### `auth.banking_details`
Student banking information for payroll.

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | int | FK → students |
| `bank_name` | varchar(100) | Bank name |
| `branch_name` | varchar(100) | Branch name |
| `account_type` | auth.bank_account_type | `chequeing` or `savings` |
| `account_number` | bytea | Encrypted |

#### `auth.payments`
Fortnightly payment records.

| Column | Type | Description |
|--------|------|-------------|
| `payment_id` | uuid | Primary key |
| `student_id` | int | FK → students |
| `period_start` | date | Pay period start |
| `period_end` | date | Pay period end |
| `hours_worked` | numeric(5,2) | Hours in period |
| `gross_amount` | numeric(8,2) | hours × $20.00 |
| `processed_at` | timestamptz | Payment processed |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

#### `auth.refresh_tokens`
Opaque refresh tokens for session management.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (CASCADE) |
| `token_hash` | varchar(64) | SHA-256 hex of opaque token |
| `expires_at` | timestamptz | Token expiry |
| `revoked_at` | timestamptz | When revoked |
| `replaced_by` | uuid | FK → refresh_tokens (rotation chain) |
| `created_at` | timestamptz | Auto-set |

#### `auth.auth_tokens`
General-purpose auth tokens (email verification, password reset, etc.).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `user_id` | uuid | FK → users (CASCADE) |
| `type` | varchar(30) | Token type (e.g. `email_verification`) |
| `token_hash` | varchar(64) | SHA-256 hex of token |
| `expires_at` | timestamptz | Token expiry |
| `used_at` | timestamptz | When consumed |
| `created_at` | timestamptz | Auto-set |

#### `schedule.time_logs`
Clock in/out records with GPS location.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | int | FK → students |
| `entry_at` | timestamptz | Clock in |
| `exit_at` | timestamptz | Clock out |
| `longitude` | numeric(9,6) | GPS longitude |
| `latitude` | numeric(9,6) | GPS latitude |
| `distance_meters` | numeric | Distance from office |
| `created_at` | timestamptz | Auto-set |

#### `schedule.schedules`
Generated work schedules.

| Column | Type | Description |
|--------|------|-------------|
| `schedule_id` | uuid | Primary key |
| `title` | varchar(100) | Schedule name |
| `is_active` | boolean | Currently active |
| `assignments` | jsonb | `{student_id: {day: [hours]}}` |
| `availability_metadata` | jsonb | Snapshot of availabilities |
| `scheduler_metadata` | jsonb | Optimizer results (objective, shortfalls) |
| `generation_id` | uuid | FK → schedule_generations |
| `effective_from` | date | Start date |
| `effective_to` | date | End date |
| `created_at` | timestamptz | Auto-set |
| `created_by` | uuid | FK → users, auto-set |
| `updated_at` | timestamptz | Auto-set |
| `archived_at` | timestamptz | When archived |

#### `schedule.shift_templates`
Defines shift slots to be staffed (scheduler inputs).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | varchar(100) | e.g., "Monday 9-10am" |
| `day_of_week` | int | 0=Monday, 6=Sunday |
| `start_time` | time | Shift start |
| `end_time` | time | Shift end |
| `min_staff` | int | Minimum tutors required |
| `max_staff` | int | Maximum tutors allowed |
| `course_demands` | jsonb | `[{course_code, tutors_required, weight}]` |
| `is_active` | boolean | Include in scheduling |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

#### `schedule.scheduler_configs`
Optimizer configurations with penalty weights.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `name` | varchar(100) | Config name |
| `course_shortfall_penalty` | float | Penalty for missing course coverage |
| `min_hours_penalty` | float | Penalty for below baseline hours |
| `max_hours_penalty` | float | Penalty for exceeding max hours |
| `understaffed_penalty` | float | Penalty for understaffed shifts |
| `extra_hours_penalty` | float | Fairness penalty for extra hours |
| `max_extra_penalty` | float | Bottleneck fairness penalty |
| `baseline_hours_target` | int | Target hours per assistant (default 6) |
| `solver_time_limit` | int | Max solver time in seconds |
| `solver_gap` | float | Optimality gap (NULL = default) |
| `log_solver_output` | boolean | Log solver output |
| `is_default` | boolean | Use as default config |
| `created_at` | timestamptz | Auto-set |
| `updated_at` | timestamptz | Auto-set |

#### `schedule.schedule_generations`
Audit log for schedule generation requests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `schedule_id` | uuid | FK → schedules (set after completion) |
| `config_id` | uuid | FK → scheduler_configs |
| `status` | varchar(20) | pending, completed, failed, infeasible |
| `request_payload` | jsonb | Input sent to solver |
| `response_payload` | jsonb | Result from solver |
| `error_message` | text | Error details if failed |
| `started_at` | timestamptz | Solver start time |
| `completed_at` | timestamptz | Solver completion time |
| `created_at` | timestamptz | Auto-set |
| `created_by` | uuid | FK → users, auto-set |

### Automatic Triggers

Note: `created_at` uses `DEFAULT CURRENT_TIMESTAMP`, no trigger needed.

| Table | `updated_at` | `created_by` |
|-------|:------------:|:------------:|
| `auth.students` | ✓ | - |
| `auth.users` | ✓ | - |
| `auth.banking_details` | ✓ | - |
| `auth.payments` | ✓ | - |
| `schedule.schedules` | ✓ | ✓ |
| `schedule.shift_templates` | ✓ | - |
| `schedule.scheduler_configs` | ✓ | - |
| `schedule.schedule_generations` | - | ✓ |

### Row-Level Security

| Table | Read | Write |
|-------|------|-------|
| `auth.students` | Admin: all, Student: own | Admin: all, Student: own |
| `auth.users` | Admin only | Admin only |
| `auth.banking_details` | Admin: all, Student: own | Admin: all, Student: own |
| `auth.payments` | Admin: all, Student: own | Internal only |
| `auth.refresh_tokens` | Internal only | Internal only |
| `auth.auth_tokens` | Internal only | Internal only |
| `schedule.time_logs` | Admin only | Admin only |
| `schedule.schedules` | Admin: all, Student: if assigned | Internal only |
| `schedule.shift_templates` | Admin: all, Student: active only | Admin only |
| `schedule.scheduler_configs` | All authenticated | Admin only |
| `schedule.schedule_generations` | Admin only | Admin only |

**Roles:**
- `authenticated` - User requests with RLS enforcement
- `internal` - System operations with full access

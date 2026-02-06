# Help Desk Rostering

A help desk and rostering application built with Go and React.

## Quick Start

```bash
# 1. Install global tools (one-time)
brew install go-task/tap/go-task
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
go install github.com/go-jet/jet/v2/cmd/jet@latest

# 2. Start the database and run migrations
task start
task migrate:up

# 3. Generate models (after migrations)
task generate:models

# 4. Start development
task dev
```

**Services:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
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

### Development

| Command | Description |
|---------|-------------|
| `task dev` | Start database + backend + frontend |
| `task dev:backend` | Run backend only |
| `task dev:frontend` | Run frontend only |

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
| `task test:coverage` | Run tests with coverage |

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
├── backend/
│   ├── cmd/server/              # Entry point
│   ├── internal/
│   │   ├── application/         # App config & routes
│   │   ├── domain/              # Business logic
│   │   ├── infrastructure/
│   │   │   └── models/          # Generated jet models
│   │   └── interfaces/          # HTTP handlers
│   └── migrations/              # SQL migrations
├── frontend/                    # React application
├── docker-compose.local.yml     # Local dev services
└── Taskfile.yml                 # Task definitions
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
| `transcript_metadata` | jsonb | Extracted transcript data (GPA, courses, current_level) |
| `availability` | jsonb | Weekly availability `{day: [hours]}` |
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
| `effective_from` | date | Start date |
| `effective_to` | date | End date |
| `created_at` | timestamptz | Auto-set |
| `created_by` | uuid | FK → users, auto-set |
| `updated_at` | timestamptz | Auto-set |
| `archived_at` | timestamptz | When archived |

### Automatic Triggers

| Table | `created_at` | `updated_at` | `created_by` |
|-------|:------------:|:------------:|:------------:|
| `auth.students` | ✓ | ✓ | - |
| `auth.users` | ✓ | ✓ | - |
| `auth.payments` | ✓ | ✓ | - |
| `schedule.time_logs` | ✓ | - | - |
| `schedule.schedules` | ✓ | ✓ | ✓ |

### Row-Level Security

| Table | Read | Write |
|-------|------|-------|
| `auth.students` | Admin: all, Student: own | Admin: all, Student: own |
| `auth.users` | Admin only | Admin only |
| `auth.banking_details` | Admin: all, Student: own | Admin: all, Student: own |
| `auth.payments` | Admin: all, Student: own | Internal only |
| `schedule.time_logs` | Admin only | Admin only |
| `schedule.schedules` | Admin: all, Student: if assigned | Internal only |

**Roles:**
- `authenticated` - User requests with RLS enforcement
- `internal` - System operations with full access

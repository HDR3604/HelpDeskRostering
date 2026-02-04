# Help Desk Rostering

A help desk and rostering application built with Go and PostgreSQL.

## Tech Stack

- **Backend:** Go 1.23, PostgreSQL 16
- **Frontend:** React, TypeScript, TanStack Router, TanStack Query, shadcn/ui
- **Infrastructure:** Docker, Docker Compose

## Prerequisites

- Docker & Docker Compose
- Go 1.24+ (for local development)
- Node.js & pnpm
- [Task](https://taskfile.dev/) - task runner
- [golang-migrate](https://github.com/golang-migrate/migrate) - database migrations

### Global Dependencies

```bash
# Task runner
pnpm add -g @go-task/cli

# Database migrations CLI
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
```

## Getting Started

### 1. Install Dependencies

```bash
# Install global tools
pnpm add -g @go-task/cli

# Install project dependencies
task install
```

### 2. Start Development

```bash
# Run both backend and frontend
task dev

# Or run separately
task dev:backend
task dev:frontend
```

### 3. Using Docker (Alternative)

```bash
task start    # Start all services
task logs     # View logs
task stop     # Stop all services
```

### Available Commands

| Command | Description |
|---------|-------------|
| **Setup** | |
| `task install` | Install all dependencies |
| `task install:backend` | Install Go dependencies |
| `task install:frontend` | Install Node dependencies |
| **Development** | |
| `task dev` | Run backend + frontend concurrently |
| `task dev:backend` | Run backend only |
| `task dev:frontend` | Run frontend only |
| **Build** | |
| `task build` | Build all projects |
| `task build:backend` | Build backend binary |
| `task build:frontend` | Build frontend |
| **Docker** | |
| `task start` | Start all Docker services |
| `task stop` | Stop all services |
| `task logs` | View Docker logs |
| **Testing** | |
| `task test` | Run all tests |
| `task test:backend` | Run backend tests |
| `task test:frontend` | Run frontend tests |
| `task test:coverage` | Run backend tests with coverage |
| **Migrations** | |
| `task migrate:up` | Run all pending migrations |
| `task migrate:down` | Rollback the last migration |
| `task migrate:reset` | Rollback all migrations |
| `task migrate:create -- name` | Create a new migration |

### Services

| Service | Port | Description |
|---------|------|-------------|
| Backend | 8080 | Go API server |
| Frontend | 5173 | Web application |
| PostgreSQL | 5432 | Database |

### Database Connection

```
Host: localhost
Port: 5432
User: helpdesk
Password: helpdesk_local
Database: helpdesk
```

### Database Schema

#### `auth.students`
Student applicants and employees.

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | int | Primary key (student number) |
| `email_address` | varchar(255) | Unique email |
| `first_name` | varchar(50) | |
| `last_name` | varchar(100) | |
| `transcript_metadata` | jsonb | Extracted transcript data (GPA, courses) |
| `availability` | jsonb | Weekly availability by day/hour |
| `created_at` | timestamptz | Auto-set on insert |
| `updated_at` | timestamptz | Auto-set on update |
| `accepted_at` | timestamptz | When application was accepted |
| `rejected_at` | timestamptz | When application was rejected |
| `deleted_at` | timestamptz | Soft delete timestamp |

#### `auth.users`
Admin accounts for system access.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | uuid | Primary key |
| `email_address` | varchar(255) | Unique email |
| `password` | varchar(255) | Hashed password |
| `role` | roles | `student` or `admin` |
| `is_active` | boolean | Account enabled |
| `created_at` | timestamptz | Auto-set on insert |
| `updated_at` | timestamptz | Auto-set on update |

#### `auth.banking_details`
Student banking information for payroll.

| Column | Type | Description |
|--------|------|-------------|
| `student_id` | int | Primary key, FK → students |
| `bank_name` | varchar(100) | Name of the bank |
| `branch_name` | varchar(100) | Branch name |
| `account_type` | bank_account_type | `chequeing` or `savings` |
| `account_number` | bytea | Encrypted account number |

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
| `processed_at` | timestamptz | When payment was processed |
| `created_at` | timestamptz | Auto-set on insert |
| `updated_at` | timestamptz | Auto-set on update |

#### `schedule.time_logs`
Clock in/out records with location.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `student_id` | int | FK → students |
| `entry_at` | timestamptz | Clock in time |
| `exit_at` | timestamptz | Clock out time |
| `longitude` | numeric(9,6) | GPS longitude |
| `latitude` | numeric(9,6) | GPS latitude |
| `distance_meters` | numeric | Distance from office (for flagging) |
| `created_at` | timestamptz | Auto-set on insert |

#### `schedule.schedules`
Generated work schedules.

| Column | Type | Description |
|--------|------|-------------|
| `schedule_id` | uuid | Primary key |
| `title` | varchar(100) | Schedule name |
| `is_active` | boolean | Currently active schedule |
| `assignments` | jsonb | `{student_id: {day: [hours]}}` |
| `availability_metadata` | jsonb | Snapshot of availabilities used |
| `effective_from` | date | Schedule start date |
| `effective_to` | date | Schedule end date |
| `created_at` | timestamptz | Auto-set on insert |
| `created_by` | uuid | FK → users, auto-set from context |
| `updated_at` | timestamptz | Auto-set on update |
| `archived_at` | timestamptz | When archived |

#### Automatic Triggers

| Table | `created_at` | `updated_at` | `created_by` |
|-------|:------------:|:------------:|:------------:|
| `auth.students` | ✓ | ✓ | - |
| `auth.users` | ✓ | ✓ | - |
| `auth.payments` | ✓ | ✓ | - |
| `schedule.time_logs` | ✓ | - | - |
| `schedule.schedules` | ✓ | ✓ | ✓ |

- `created_at`: Set to `NOW()` on INSERT
- `updated_at`: Set to `NOW()` on UPDATE
- `created_by`: Set from `app.current_user_id` session context on INSERT

### Row-Level Security

| Table | Read | Write |
|-------|------|-------|
| `auth.students` | Admin: all, Student: own row | Admin: all, Student: own row (UPDATE only) |
| `auth.users` | Admin only | Admin only |
| `auth.banking_details` | Admin: all, Student: own row | Admin: all, Student: own row |
| `auth.payments` | Admin: all, Student: own row | Admin only (via internal) |
| `schedule.time_logs` | Admin only | Admin only |
| `schedule.schedules` | Admin: all, Student: if in assignments | Admin only (via internal) |

## Project Structure

```
├── backend/
│   ├── cmd/server/        # Entry point
│   ├── internal/
│   │   ├── application/   # App config & routes
│   │   ├── domain/        # Business logic
│   │   ├── infrastructure/# Database, external services
│   │   └── interfaces/    # HTTP handlers
│   └── migrations/        # Database migrations
├── frontend/              # Web application
└── docker-compose.local.yml
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

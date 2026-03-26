# Backend

Go REST API for the Help Desk Rostering application. Domain-Driven Design with PostgreSQL Row-Level Security.

## Quick Start

```bash
# Via Docker (from project root)
task start

# Local development
cd apps/backend
go run cmd/server/main.go
```

http://localhost:8080

## Tech Stack

| | |
|---|---|
| **Language** | Go 1.25 |
| **Router** | Chi v5 |
| **ORM** | Go-Jet v2 (type-safe SQL) |
| **Database** | PostgreSQL 16 (RLS) |
| **Job Queue** | River (PostgreSQL-backed, no Redis) |
| **Auth** | JWT (access + refresh tokens) |
| **Email** | Mailpit (dev) / Resend (prod) |
| **Logging** | Zap |
| **Hot Reload** | Air (via Docker) |

## API

Base URL: `http://localhost:8080/api/v1`

### Auth (public)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/auth/register` | Register a new user |
| `POST` | `/auth/login` | Login, returns access + refresh tokens |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/auth/logout` | Revoke refresh token |
| `POST` | `/auth/verify-email` | Verify email with token |
| `POST` | `/auth/resend-verification` | Resend verification email |
| `POST` | `/auth/forgot-password` | Send password reset email |
| `POST` | `/auth/reset-password` | Reset password with token |

### Auth (protected)

| Method | Path | Description |
|--------|------|-------------|
| `PATCH` | `/auth/change-password` | Change current user's password |

### Schedules

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/schedules/` | Create a schedule |
| `POST` | `/schedules/generate` | Generate schedule via solver (async — returns `202` with generation ID) |
| `GET` | `/schedules/` | List active schedules |
| `GET` | `/schedules/archived` | List archived schedules |
| `GET` | `/schedules/{id}` | Get schedule by ID |
| `PATCH` | `/schedules/{id}/archive` | Archive a schedule |
| `PATCH` | `/schedules/{id}/unarchive` | Unarchive a schedule |
| `PATCH` | `/schedules/{id}/activate` | Activate a schedule |
| `PATCH` | `/schedules/{id}/deactivate` | Deactivate a schedule |
| `POST` | `/schedules/{id}/notify` | Notify students of their schedule (async — returns `202`) |
| `PUT` | `/schedules/{id}` | Update schedule (title, assignments) |

### Schedule Generations

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/schedule-generations/` | List all generations |
| `GET` | `/schedule-generations/{id}` | Get generation by ID |
| `GET` | `/schedule-generations/{id}/status` | Get generation status |

### Shift Templates

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/shift-templates/` | Create a shift template |
| `POST` | `/shift-templates/bulk` | Bulk create shift templates |
| `GET` | `/shift-templates/` | List active shift templates |
| `GET` | `/shift-templates/all` | List all shift templates |
| `GET` | `/shift-templates/{id}` | Get shift template by ID |
| `PUT` | `/shift-templates/{id}` | Update a shift template |
| `PATCH` | `/shift-templates/{id}/activate` | Activate a shift template |
| `PATCH` | `/shift-templates/{id}/deactivate` | Deactivate a shift template |

### Scheduler Configs

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/scheduler-configs/` | Create a config |
| `GET` | `/scheduler-configs/` | List all configs |
| `GET` | `/scheduler-configs/default` | Get the default config |
| `GET` | `/scheduler-configs/{id}` | Get config by ID |
| `PUT` | `/scheduler-configs/{id}` | Update a config |
| `PATCH` | `/scheduler-configs/{id}/set-default` | Set config as default |


### Students (public)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/students` | Submit student application |

### Students (admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/students` | List students (optional `?status=pending\|accepted\|rejected`) |
| `GET` | `/students/{id}` | Get student by ID |
| `PATCH` | `/students/{id}/accept` | Accept application |
| `PATCH` | `/students/{id}/reject` | Reject application |

### Students (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/students/me` | Get own student profile |
| `PUT` | `/students/me` | Update own profile (phone, availability, hours) |

### Users

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users` | Create a user |
| `GET` | `/users` | List all users |
| `GET` | `/users/{id}` | Get user by ID |
| `PUT` | `/users/{id}` | Update a user |
| `DELETE` | `/users/{id}` | Deactivate a user |

### Time Logs (authenticated, rate limited)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/time-logs/clock-in` | Clock in with code + GPS coordinates |
| `POST` | `/time-logs/clock-out` | Clock out (closes open time log) |
| `GET` | `/time-logs/me/status` | Get current clock-in status + shift info |
| `GET` | `/time-logs/me` | List own time logs (paginated: `?page=1&per_page=20`) |

### Clock-In Codes (admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/clock-in-codes/` | Generate a new clock-in code |
| `GET` | `/clock-in-codes/active` | Get the current active code |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns `OK` |

## Project Structure

```
├── cmd/server/               # Entry point (main.go)
└── internal/
    ├── application/          # App wiring, config, routes
    ├── domain/               # Business logic (DDD)
    │   ├── auth/             # Authentication (JWT, email verification)
    │   ├── schedule/         # Schedules, generations, shifts, configs
    │   ├── student/          # Student applications, accept/reject workflow
    │   ├── timelog/          # Clock-in/out, attendance tracking, geo-validation
    │   └── user/             # User accounts, roles
    ├── infrastructure/       # External dependencies
    │   ├── database/         # Transaction manager (InAuthTx / InSystemTx)
    │   ├── jobqueue/         # River job queue (client, enqueuer, migrations)
    │   │   └── jobs/         # Worker implementations (schedule generation, email)
    │   ├── auth/             # Token repository implementations
    │   ├── user/             # User repository implementation
    │   ├── student/          # Student repository implementation
    │   ├── schedule/         # Schedule repository implementations
    │   ├── timelog/          # TimeLog + ClockInCode repository implementations
    │   ├── email/            # Mailpit + Resend email senders
    │   ├── scheduler/        # HTTP client to scheduler service
    │   ├── transcripts/      # HTTP client to transcripts service
    │   └── models/           # Auto-generated Go-Jet models
    ├── middleware/            # JWT auth middleware
    └── tests/                # Unit, integration, e2e, mocks
```

## Testing

```bash
task test:backend         # Run all backend tests
```

Integration tests use testcontainers-go with real PostgreSQL — no mocking the database.

## Development Guide

See [DEVELOPMENT.md](DEVELOPMENT.md) for DDD architecture patterns, transaction manager usage, step-by-step domain implementation walkthrough, and testing conventions.

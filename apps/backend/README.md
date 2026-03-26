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
| `POST` | `/auth/validate-onboarding-token` | Validate onboarding token |
| `POST` | `/auth/complete-onboarding` | Complete onboarding (set password) |

### Auth (protected)

| Method | Path | Description |
|--------|------|-------------|
| `PATCH` | `/auth/change-password` | Change current user's password |

### Schedules (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/schedules/active` | Get active schedule |
| `GET` | `/schedules/{id}` | Get schedule by ID |

### Schedules (admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/schedules` | Create a schedule |
| `POST` | `/schedules/generate` | Generate schedule via solver (async — returns `202` with generation ID) |
| `GET` | `/schedules` | List active schedules |
| `GET` | `/schedules/archived` | List archived schedules |
| `PUT` | `/schedules/{id}` | Update schedule (title, assignments) |
| `PATCH` | `/schedules/{id}/archive` | Archive a schedule |
| `PATCH` | `/schedules/{id}/unarchive` | Unarchive a schedule |
| `PATCH` | `/schedules/{id}/activate` | Activate a schedule |
| `PATCH` | `/schedules/{id}/deactivate` | Deactivate a schedule |
| `POST` | `/schedules/{id}/notify` | Notify students of their schedule (async — returns `202`) |

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
| `DELETE` | `/scheduler-configs/{id}` | Delete a config (cannot delete default — returns 409) |
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
| `PATCH` | `/students/{id}/deactivate` | Deactivate a student |
| `PATCH` | `/students/{id}/activate` | Activate a student |
| `PATCH` | `/students/bulk-deactivate` | Bulk deactivate students |
| `PATCH` | `/students/bulk-activate` | Bulk activate students |
| `GET` | `/students/{id}/banking-details` | Get student's banking details |
| `PUT` | `/students/{id}/banking-details` | Upsert student's banking details |

### Students (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/students/me` | Get own student profile |
| `PUT` | `/students/me` | Update own profile (phone, availability, hours, transcript data) |
| `GET` | `/students/me/banking-details` | Get own banking details |
| `PUT` | `/students/me/banking-details` | Upsert own banking details (partial — only send changed fields) |

### Users (admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/users` | Create a user |
| `GET` | `/users` | List all users |
| `DELETE` | `/users/{id}` | Deactivate a user |

### Users (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/users/{id}` | Get user by ID |
| `PUT` | `/users/{id}` | Update a user |
| `PUT` | `/users/me` | Update own profile (first name, last name, email) |

### Transcripts (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/transcripts/extract` | Extract courses/GPA/programme from uploaded PDF |

### Time Logs (authenticated, rate limited)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/time-logs/clock-in` | Clock in with code + GPS coordinates |
| `POST` | `/time-logs/clock-out` | Clock out (closes open time log) |
| `GET` | `/time-logs/me/status` | Get current clock-in status + shift info |
| `GET` | `/time-logs/me` | List own time logs (paginated: `?page=1&per_page=20`) |

### Time Logs (admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/time-logs` | List all time logs (paginated, searchable) |
| `GET` | `/time-logs/{id}` | Get time log by ID |
| `PATCH` | `/time-logs/{id}/flag` | Flag a time log |
| `PATCH` | `/time-logs/{id}/unflag` | Unflag a time log |

### Clock-In Codes (admin)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/clock-in-codes/` | Generate a new clock-in code |
| `GET` | `/clock-in-codes/active` | Get the current active code |

### Payroll (admin)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/payroll/` | List payments |
| `POST` | `/payroll/generate` | Generate payments for a period |
| `POST` | `/payroll/{id}/process` | Process a payment |
| `POST` | `/payroll/{id}/revert` | Revert a payment |
| `POST` | `/payroll/bulk-process` | Bulk process payments |
| `GET` | `/payroll/export` | Export payments as CSV |

### Verification (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/verification/send-code` | Send verification code |
| `POST` | `/verification/verify-code` | Verify code |

### Consent (authenticated)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/consent/current` | Get current consent version |

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
    │   ├── auth/             # Authentication (JWT, email verification, onboarding)
    │   ├── consent/          # Banking consent tracking
    │   ├── payroll/          # Payment generation, processing, CSV export
    │   ├── schedule/         # Schedules, generations, shifts, configs
    │   ├── student/          # Student applications, banking details, transcripts
    │   ├── timelog/          # Clock-in/out, attendance tracking, geo-validation
    │   ├── transcript/       # PDF transcript extraction proxy
    │   ├── user/             # User accounts, roles, profile updates
    │   └── verification/     # Email/phone verification codes
    ├── infrastructure/       # External dependencies
    │   ├── database/         # Transaction manager (InAuthTx / InSystemTx)
    │   ├── jobqueue/         # River job queue (client, enqueuer, migrations)
    │   │   └── jobs/         # Worker implementations (schedule generation, email)
    │   ├── auth/             # Token repository implementations
    │   ├── consent/          # Consent repository implementation
    │   ├── crypto/           # AES encryption for sensitive data (account numbers)
    │   ├── email/            # Mailpit + Resend email senders
    │   ├── payroll/          # Payroll repository implementation
    │   ├── schedule/         # Schedule repository implementations
    │   ├── scheduler/        # HTTP client to scheduler service
    │   ├── student/          # Student + banking details repository implementations
    │   ├── timelog/          # TimeLog + ClockInCode repository implementations
    │   ├── transcripts/      # HTTP client to transcripts service + types
    │   ├── user/             # User repository implementation
    │   ├── verification/     # Verification repository implementation
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

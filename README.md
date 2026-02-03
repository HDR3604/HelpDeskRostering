# Help Desk Rostering

A help desk and rostering application built with Go and PostgreSQL.

## Tech Stack

- **Backend:** Go 1.23, PostgreSQL 16
- **Frontend:** React, TypeScript, TanStack Router, TanStack Query, shadcn/ui
- **Infrastructure:** Docker, Docker Compose

## Prerequisites

- Docker & Docker Compose
- Go 1.23+ (for local development)
- Node.js & pnpm
- [Task](https://taskfile.dev/) - task runner

### Global Dependencies

```bash
pnpm add -g @go-task/cli
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

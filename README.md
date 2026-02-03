# Help-Desk-App

A help desk and rostering application built with Go and PostgreSQL.

## Tech Stack

- **Backend:** Go 1.23, PostgreSQL 16
- **Frontend:** TBD
- **Infrastructure:** Docker, Docker Compose

## Prerequisites

- Docker & Docker Compose
- Go 1.23+ (for local development)

## Getting Started

### Local Development

```bash
# Start all services
docker-compose -f docker-compose.local.yml up -d

# View logs
docker-compose -f docker-compose.local.yml logs -f
```

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

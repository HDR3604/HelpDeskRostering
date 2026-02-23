# Development Guide

This guide walks through the backend architecture and patterns for implementing new features.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Infrastructure](#core-infrastructure)
  - [Transaction Manager](#transaction-manager)
  - [Auth Context](#auth-context)
  - [Database Models (Go-Jet)](#database-models-go-jet)
  - [Middleware](#middleware)
  - [Email Service](#email-service)
- [Example: Adding a "Courses" Domain](#example-adding-a-courses-domain)
  - [Step 1: Aggregate](#step-1-aggregate)
  - [Step 2: Domain Errors](#step-2-domain-errors)
  - [Step 3: Repository Interface](#step-3-repository-interface)
  - [Step 4: Infrastructure Repository](#step-4-infrastructure-repository)
  - [Step 5: Service](#step-5-service)
  - [Step 6: DTOs](#step-6-dtos)
  - [Step 7: Handler](#step-7-handler)
  - [Step 8: Wiring](#step-8-wiring)
- [File Structure](#file-structure)
- [Checklist](#checklist)
- [Key Patterns](#key-patterns)
  - [Handler Pattern](#handler-pattern)
  - [DTO Conversion](#dto-conversion)
  - [Error Handling](#error-handling)
  - [Repository Pattern](#repository-pattern)
  - [Transaction Usage](#transaction-usage)
  - [Testing](#testing)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Middleware (JWT / Dev Auth)                      │
│       Validates token, injects AuthContext                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Handler (domain/<name>/handler/)                 │
│       Decodes request, calls service, writes response        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Service (domain/<name>/service/)                 │
│       Business logic, orchestrates transactions              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Repository (infrastructure/<name>/)             │
│       Go-Jet queries, returns domain aggregates              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              PostgreSQL (RLS enforced via TxManager)          │
│       auth + schedule schemas, row-level security            │
└─────────────────────────────────────────────────────────────┘
```

Each domain follows **Domain-Driven Design** with this layered pattern:

**Aggregate → Errors → Repository Interface → Infrastructure Repo → Service → Handler → DTOs**

Current domains: `auth`, `schedule`, `user`.

---

## Core Infrastructure

### Transaction Manager

All database access goes through the transaction manager (`infrastructure/database/tx_manager.go`). Two modes:

| Method | Role | RLS | Use Case |
|--------|------|-----|----------|
| `InAuthTx` | `authenticated` | Enforced | Reads with user-scoped visibility |
| `InSystemTx` | `internal` | Bypassed | Writes, registration, admin operations |

```go
// Read with RLS — user only sees rows they're allowed to
err := s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
    result, err = s.repo.GetByID(ctx, tx, id)
    return err
})

// Write bypassing RLS
err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
    return s.repo.Create(ctx, tx, entity)
})
```

**Important:** `InAuthTx` sets session variables (`app.current_user_id`, `app.current_role`, `app.current_student_id`) that PostgreSQL RLS policies use. `InSystemTx` does not set these, so the `set_created_by` trigger won't fire — you must explicitly insert `created_by`.

### Auth Context

The `AuthContext` struct carries the authenticated user's identity through the request lifecycle:

```go
type AuthContext struct {
    UserID    string  // app.current_user_id
    StudentID *string // app.current_student_id (nil for admins)
    Role      string  // "admin" or "student"
}
```

**Injecting/extracting:**

```go
// Middleware injects it
ctx = database.WithAuthContext(r.Context(), authCtx)

// Handler/service extracts it
ac, ok := database.AuthContextFromContext(ctx)
if !ok {
    writeError(w, http.StatusUnauthorized, "unauthorized")
    return
}
```

### Database Models (Go-Jet)

Type-safe SQL models are auto-generated from the live database schema:

```bash
task generate:models   # Regenerates from current schema
```

Models live in `infrastructure/models/helpdesk/{schema}/`. Each schema directory contains:
- `model/` — Go structs matching table columns
- `table/` — Table definitions for building queries
- `enum/` — PostgreSQL enum types

**Key conventions:**
- UUID columns: use `postgres.UUID(parsedUUID)` not `postgres.String(id.String())`
- Integer columns: use `postgres.Int32(val)`
- Empty list on no rows: return `[]*Type{}` (not nil) when `qrm.ErrNoRows`

### Middleware

JWT authentication middleware (`internal/middleware/jwt_auth.go`):

1. Extracts Bearer token from `Authorization` header
2. Validates via `authService.ValidateAccessToken()`
3. Builds `AuthContext` from token claims (UserID, Role, StudentID)
4. Injects into request context

In development, `devAuthMiddleware` bypasses JWT and injects a hardcoded admin context when `DEV_USER_ID` is set.

**Route organization** (`application/routes.go`):

```go
r.Route("/api/v1", func(r chi.Router) {
    // Public routes (no JWT)
    authHdl.RegisterRoutes(r)

    // Protected routes (JWT or dev middleware)
    r.Group(func(r chi.Router) {
        r.Use(authMiddleware.JWTAuth(authSvc))

        authHdl.RegisterAuthenticatedRoutes(r)
        scheduleHdl.RegisterRoutes(r)
        // ... more handlers
    })
})
```

### Email Service

Abstracted behind `EmailSenderInterface` with two implementations:

| Environment | Implementation | Transport |
|-------------|---------------|-----------|
| Development | `MailpitEmailSenderService` | SMTP to localhost:1025 |
| Production | `ResendEmailSenderService` | Resend.com API |

Selection is automatic in `app.go` based on `ENVIRONMENT`.

---

## Example: Adding a "Courses" Domain

This walkthrough adds a new domain for managing university courses.

---

### Step 1: Aggregate

Define the domain entity with validation in the factory constructor.

```go
// internal/domain/course/aggregate/course_aggregate.go
package aggregate

import (
    "fmt"
    "time"

    "github.com/google/uuid"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
)

type Course struct {
    CourseID  uuid.UUID
    Code      string
    Title     string
    Level     int
    IsActive  bool
    CreatedAt time.Time
    UpdatedAt *time.Time
}

func NewCourse(code, title string, level int) (*Course, error) {
    if code == "" {
        return nil, fmt.Errorf("course code is required")
    }
    if title == "" {
        return nil, fmt.Errorf("course title is required")
    }
    if level < 1 || level > 4 {
        return nil, fmt.Errorf("course level must be between 1 and 4")
    }

    return &Course{
        CourseID: uuid.New(),
        Code:     code,
        Title:    title,
        Level:    level,
        IsActive: true,
    }, nil
}

func (c *Course) Deactivate() {
    c.IsActive = false
}

// ToModel converts to Go-Jet model for inserts
func (c *Course) ToModel() *model.Courses {
    return &model.Courses{
        CourseID: c.CourseID,
        Code:     c.Code,
        Title:    c.Title,
        Level:    int32(c.Level),
        IsActive: c.IsActive,
    }
}

// CourseFromModel converts from Go-Jet model
func CourseFromModel(m *model.Courses) *Course {
    return &Course{
        CourseID:  m.CourseID,
        Code:      m.Code,
        Title:     m.Title,
        Level:     int(m.Level),
        IsActive:  m.IsActive,
        CreatedAt: m.CreatedAt,
        UpdatedAt: m.UpdatedAt,
    }
}
```

---

### Step 2: Domain Errors

Define typed errors for domain-specific failure cases.

```go
// internal/domain/course/errors/course_errors.go
package errors

import "errors"

var (
    ErrCourseNotFound     = errors.New("course not found")
    ErrCourseCodeExists   = errors.New("course code already exists")
    ErrInvalidCourseCode  = errors.New("invalid course code format")
    ErrInvalidCourseLevel = errors.New("course level must be between 1 and 4")
)
```

---

### Step 3: Repository Interface

Define the interface in the domain layer — implementations live in infrastructure.

```go
// internal/domain/course/repository/course_repository_interface.go
package repository

import (
    "context"
    "database/sql"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
)

type CourseRepositoryInterface interface {
    Create(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error)
    GetByID(ctx context.Context, tx *sql.Tx, courseID string) (*aggregate.Course, error)
    GetByCode(ctx context.Context, tx *sql.Tx, code string) (*aggregate.Course, error)
    List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Course, error)
    Update(ctx context.Context, tx *sql.Tx, course *aggregate.Course) error
}
```

Note: Every method takes `*sql.Tx` — the transaction is managed by TxManager at the service layer.

---

### Step 4: Infrastructure Repository

Implement the interface using Go-Jet queries.

```go
// internal/infrastructure/course/course_repository.go
package course

import (
    "context"
    "database/sql"
    "errors"

    "github.com/google/uuid"
    "github.com/go-jet/jet/v2/postgres"
    "github.com/go-jet/jet/v2/qrm"
    "go.uber.org/zap"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/table"
)

type CourseRepository struct {
    logger *zap.Logger
}

func NewCourseRepository(logger *zap.Logger) *CourseRepository {
    return &CourseRepository{logger: logger}
}

func (r *CourseRepository) GetByID(ctx context.Context, tx *sql.Tx, courseID string) (*aggregate.Course, error) {
    parsedID, err := uuid.Parse(courseID)
    if err != nil {
        return nil, courseErrors.ErrCourseNotFound
    }

    stmt := table.Courses.
        SELECT(table.Courses.AllColumns).
        WHERE(table.Courses.CourseID.EQ(postgres.UUID(parsedID)))

    var dest model.Courses
    err = stmt.QueryContext(ctx, tx, &dest)
    if errors.Is(err, qrm.ErrNoRows) {
        return nil, courseErrors.ErrCourseNotFound
    }
    if err != nil {
        r.logger.Error("failed to get course", zap.Error(err))
        return nil, err
    }

    return aggregate.CourseFromModel(&dest), nil
}

func (r *CourseRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Course, error) {
    stmt := table.Courses.
        SELECT(table.Courses.AllColumns).
        ORDER_BY(table.Courses.Code.ASC())

    var dest []model.Courses
    err := stmt.QueryContext(ctx, tx, &dest)
    if errors.Is(err, qrm.ErrNoRows) {
        return []*aggregate.Course{}, nil // empty slice, not nil
    }
    if err != nil {
        r.logger.Error("failed to list courses", zap.Error(err))
        return nil, err
    }

    result := make([]*aggregate.Course, len(dest))
    for i := range dest {
        result[i] = aggregate.CourseFromModel(&dest[i])
    }
    return result, nil
}

// Create, GetByCode, Update follow the same patterns...
```

---

### Step 5: Service

Orchestrate business logic using the transaction manager and repository.

```go
// internal/domain/course/service/course_service.go
package service

import (
    "context"
    "database/sql"
    "errors"

    "go.uber.org/zap"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/domain/course/repository"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
)

type CourseServiceInterface interface {
    Create(ctx context.Context, code, title string, level int) (*aggregate.Course, error)
    GetByID(ctx context.Context, courseID string) (*aggregate.Course, error)
    List(ctx context.Context) ([]*aggregate.Course, error)
}

type CourseService struct {
    logger    *zap.Logger
    txManager database.TxManagerInterface
    repo      repository.CourseRepositoryInterface
}

func NewCourseService(
    logger *zap.Logger,
    txManager database.TxManagerInterface,
    repo repository.CourseRepositoryInterface,
) *CourseService {
    return &CourseService{logger: logger, txManager: txManager, repo: repo}
}

func (s *CourseService) Create(ctx context.Context, code, title string, level int) (*aggregate.Course, error) {
    course, err := aggregate.NewCourse(code, title, level)
    if err != nil {
        return nil, err
    }

    var created *aggregate.Course
    err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
        // Check for duplicate code
        existing, err := s.repo.GetByCode(ctx, tx, code)
        if err != nil && !errors.Is(err, courseErrors.ErrCourseNotFound) {
            return err
        }
        if existing != nil {
            return courseErrors.ErrCourseCodeExists
        }

        created, err = s.repo.Create(ctx, tx, course)
        return err
    })
    if err != nil {
        return nil, err
    }
    return created, nil
}

func (s *CourseService) GetByID(ctx context.Context, courseID string) (*aggregate.Course, error) {
    ac, ok := database.AuthContextFromContext(ctx)
    if !ok {
        return nil, errors.New("unauthorized")
    }

    var course *aggregate.Course
    err := s.txManager.InAuthTx(ctx, ac, func(tx *sql.Tx) error {
        var err error
        course, err = s.repo.GetByID(ctx, tx, courseID)
        return err
    })
    return course, err
}

func (s *CourseService) List(ctx context.Context) ([]*aggregate.Course, error) {
    ac, ok := database.AuthContextFromContext(ctx)
    if !ok {
        return nil, errors.New("unauthorized")
    }

    var courses []*aggregate.Course
    err := s.txManager.InAuthTx(ctx, ac, func(tx *sql.Tx) error {
        var err error
        courses, err = s.repo.List(ctx, tx)
        return err
    })
    return courses, err
}
```

---

### Step 6: DTOs

Define request/response types and conversion functions in a separate package.

```go
// internal/domain/course/handler/dtos/course_dtos.go
package dtos

import (
    "time"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
)

// --- Requests ---

type CreateCourseRequest struct {
    Code  string `json:"code"`
    Title string `json:"title"`
    Level int    `json:"level"`
}

// --- Responses ---

type CourseResponse struct {
    CourseID  string     `json:"course_id"`
    Code      string     `json:"code"`
    Title     string     `json:"title"`
    Level     int        `json:"level"`
    IsActive  bool       `json:"is_active"`
    CreatedAt time.Time  `json:"created_at"`
    UpdatedAt *time.Time `json:"updated_at"`
}

func CourseToResponse(c *aggregate.Course) CourseResponse {
    return CourseResponse{
        CourseID:  c.CourseID.String(),
        Code:      c.Code,
        Title:     c.Title,
        Level:     c.Level,
        IsActive:  c.IsActive,
        CreatedAt: c.CreatedAt,
        UpdatedAt: c.UpdatedAt,
    }
}

func CoursesToResponse(courses []*aggregate.Course) []CourseResponse {
    result := make([]CourseResponse, len(courses))
    for i, c := range courses {
        result[i] = CourseToResponse(c)
    }
    return result
}
```

**DTOs are a separate Go package** (`package dtos`) imported by the handler. This prevents circular imports and keeps domain logic clean.

---

### Step 7: Handler

HTTP handler that decodes requests, calls the service, and maps errors to status codes.

```go
// internal/domain/course/handler/course_handler.go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"

    "github.com/go-chi/chi/v5"
    "go.uber.org/zap"

    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/domain/course/handler/dtos"
    "github.com/HDR3604/HelpDeskApp/internal/domain/course/service"
)

type CourseHandler struct {
    logger  *zap.Logger
    service service.CourseServiceInterface
}

func NewCourseHandler(logger *zap.Logger, service service.CourseServiceInterface) *CourseHandler {
    return &CourseHandler{logger: logger, service: service}
}

func (h *CourseHandler) RegisterRoutes(r chi.Router) {
    r.Route("/courses", func(r chi.Router) {
        r.Get("/", h.List)
        r.Post("/", h.Create)
        r.Get("/{courseID}", h.GetByID)
    })
}

func (h *CourseHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req dtos.CreateCourseRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    course, err := h.service.Create(r.Context(), req.Code, req.Title, req.Level)
    if err != nil {
        h.handleServiceError(w, err)
        return
    }

    writeJSON(w, http.StatusCreated, dtos.CourseToResponse(course))
}

func (h *CourseHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    courseID := chi.URLParam(r, "courseID")

    course, err := h.service.GetByID(r.Context(), courseID)
    if err != nil {
        h.handleServiceError(w, err)
        return
    }

    writeJSON(w, http.StatusOK, dtos.CourseToResponse(course))
}

func (h *CourseHandler) List(w http.ResponseWriter, r *http.Request) {
    courses, err := h.service.List(r.Context())
    if err != nil {
        h.handleServiceError(w, err)
        return
    }

    writeJSON(w, http.StatusOK, dtos.CoursesToResponse(courses))
}

func (h *CourseHandler) handleServiceError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, courseErrors.ErrCourseNotFound):
        writeError(w, http.StatusNotFound, err.Error())
    case errors.Is(err, courseErrors.ErrCourseCodeExists):
        writeError(w, http.StatusConflict, err.Error())
    default:
        h.logger.Error("unhandled error", zap.Error(err))
        writeError(w, http.StatusInternalServerError, "internal server error")
    }
}

func writeJSON(w http.ResponseWriter, status int, data any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
    writeJSON(w, status, map[string]string{"error": message})
}
```

---

### Step 8: Wiring

Register the new domain in `application/app.go` and `application/routes.go`.

**In `app.go`** — instantiate repo → service → handler:

```go
// Repository
courseRepo := courseInfra.NewCourseRepository(logger)

// Service
courseSvc := courseService.NewCourseService(logger, txManager, courseRepo)

// Handler
courseHdl := courseHandler.NewCourseHandler(logger, courseSvc)
```

**In `routes.go`** — add the handler parameter and register routes:

```go
func registerRoutes(
    // ... existing params
    courseHdl *courseHandler.CourseHandler,
) {
    r.Route("/api/v1", func(r chi.Router) {
        r.Group(func(r chi.Router) {
            r.Use(authMiddleware.JWTAuth(authSvc))
            // ... existing routes
            courseHdl.RegisterRoutes(r)
        })
    })
}
```

---

## File Structure

```
internal/
├── application/               # App wiring
│   ├── app.go                 # DB connect, DI, server lifecycle
│   ├── config.go              # Environment config (PORT, JWT, email)
│   └── routes.go              # Chi router setup, middleware, route registration
├── domain/                    # Business logic (one dir per domain)
│   ├── auth/
│   │   ├── aggregate/         # AuthToken, RefreshToken entities
│   │   ├── errors/            # ErrInvalidCredentials, ErrEmailAlreadyExists, etc.
│   │   ├── handler/           # AuthHandler (register, login, refresh, verify)
│   │   ├── repository/        # Token repository interfaces
│   │   ├── service/           # AuthService (JWT, passwords, email verification)
│   │   └── types/dtos/        # RegisterRequest, LoginRequest, AuthTokenResponse
│   ├── schedule/
│   │   ├── aggregate/         # Schedule, ShiftTemplate, SchedulerConfig, Generation
│   │   ├── errors/            # Per-aggregate error files
│   │   ├── handler/           # 4 handlers (schedule, generation, config, shift)
│   │   ├── handler/dtos/      # Per-aggregate DTO files
│   │   ├── repository/        # 4 repository interfaces
│   │   └── service/           # 4 services
│   └── user/
│       ├── aggregate/         # User entity (role validation, email domain rules)
│       ├── errors/            # ErrUserNotFound, ErrEmailAlreadyExists
│       ├── repository/        # UserRepositoryInterface
│       └── service/           # UserService
├── infrastructure/            # External dependencies
│   ├── database/
│   │   ├── tx_manager.go      # InAuthTx / InSystemTx
│   │   └── tx_manager_types.go # AuthContext struct
│   ├── auth/                  # Auth token repository implementations
│   ├── user/                  # User repository implementation
│   ├── schedule/              # Schedule repository implementations
│   ├── email/
│   │   ├── interfaces/        # EmailSenderInterface
│   │   ├── service/           # MailpitEmailSenderService, ResendEmailSenderService
│   │   ├── templates/         # Email template rendering
│   │   └── types/             # Email DTOs and config types
│   ├── scheduler/
│   │   └── service/           # HTTP client to scheduler microservice
│   ├── transcripts/
│   │   ├── interfaces/        # TranscriptsInterface
│   │   └── service/           # HTTP client to transcripts microservice
│   └── models/                # Auto-generated Go-Jet models (do not edit)
│       └── helpdesk/
│           ├── auth/          # model/, table/, enum/
│           └── schedule/      # model/, table/
├── middleware/
│   └── jwt_auth.go            # JWT validation + AuthContext injection
└── tests/
    ├── mocks/                 # Function-based mocks for all interfaces
    ├── unit/                  # Unit tests (domain logic, handlers)
    │   ├── domains/auth/
    │   ├── domains/schedule/
    │   ├── domains/user/
    │   └── infrastructure/
    ├── integration/           # Integration tests (real PostgreSQL via testcontainers)
    │   ├── auth/
    │   ├── schedule/
    │   ├── user/
    │   ├── database/
    │   └── email/
    ├── e2e/                   # End-to-end auth flow tests
    │   └── auth/
    └── utils/                 # TestDB helper (testcontainers setup, migrations)
```

---

## Checklist

When implementing a new domain:

- [ ] **Migration**: Create table DDL, triggers (`set_updated_at`, `set_created_by`), RLS policies, grants
- [ ] **Generate models**: `task migrate:up && task generate:models`
- [ ] **Aggregate**: Entity struct with `NewX()` factory, validation, `ToModel()` / `FromModel()`
- [ ] **Errors**: Domain-specific error variables (`ErrXNotFound`, etc.)
- [ ] **Repository interface**: Define in `domain/<name>/repository/`
- [ ] **Infrastructure repo**: Implement in `infrastructure/<name>/` using Go-Jet
- [ ] **Service**: Business logic with `TxManager` orchestration
- [ ] **DTOs**: Request/response structs in `handler/dtos/` (separate package)
- [ ] **Handler**: HTTP handler with route registration and error mapping
- [ ] **Wiring**: Add repo → service → handler chain in `app.go`, register in `routes.go`
- [ ] **Mock**: Add function-based mock in `tests/mocks/`
- [ ] **Tests**: Unit tests for aggregate + handler, integration tests for repository + service

---

## Key Patterns

### Handler Pattern

Every handler follows the same structure:

1. Decode JSON request body
2. Extract URL params (`chi.URLParam`)
3. Call service method
4. Handle errors via `handleServiceError()` (maps domain errors → HTTP status)
5. Write JSON response via `writeJSON()`

```go
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
    id := chi.URLParam(r, "id")

    result, err := h.service.GetByID(r.Context(), id)
    if err != nil {
        h.handleServiceError(w, err)
        return
    }

    writeJSON(w, http.StatusOK, dtos.ToResponse(result))
}
```

### DTO Conversion

DTOs live in `handler/dtos/` as `package dtos` — a separate Go package from the handler.

- `ToResponse(aggregate) → response` for single items
- `ToResponses([]aggregate) → []response` for lists
- Request structs use `json:"snake_case"` tags
- Dates formatted as `"2006-01-02"` strings in responses (avoids timezone issues)
- JSONB fields use `json.RawMessage`

### Error Handling

Services return domain errors. Handlers map them to HTTP status codes:

```go
func (h *Handler) handleServiceError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, domainErrors.ErrNotFound):
        writeError(w, http.StatusNotFound, err.Error())
    case errors.Is(err, domainErrors.ErrAlreadyExists):
        writeError(w, http.StatusConflict, err.Error())
    case errors.Is(err, domainErrors.ErrInvalidInput):
        writeError(w, http.StatusBadRequest, err.Error())
    default:
        h.logger.Error("unhandled error", zap.Error(err))
        writeError(w, http.StatusInternalServerError, "internal server error")
    }
}
```

**Never expose internal errors to clients** — unmatched errors always return a generic 500.

### Repository Pattern

- Domain defines the interface (`domain/<name>/repository/`)
- Infrastructure implements it (`infrastructure/<name>/`)
- Every method takes `context.Context` and `*sql.Tx` (transaction from TxManager)
- Returns domain aggregates, never raw database models
- On `qrm.ErrNoRows` → return domain's `ErrNotFound`
- On empty list → return `[]*Type{}` (empty slice), not nil

### Transaction Usage

| Operation | Method | Why |
|-----------|--------|-----|
| Read (user-scoped) | `InAuthTx` | RLS ensures user only sees their own data |
| Read (admin list) | `InAuthTx` | RLS allows admin to see all rows |
| Create / Update / Delete | `InSystemTx` | Bypasses RLS, needs explicit `created_by` |
| Registration (no user yet) | `InSystemTx` | No authenticated user context available |

### Testing

**Integration tests** use testcontainers-go with real PostgreSQL:

```go
type CourseRepoTestSuite struct {
    suite.Suite
    testDB    *utils.TestDB
    txManager database.TxManagerInterface
    repo      repository.CourseRepositoryInterface
    ctx       context.Context
}

func (s *CourseRepoTestSuite) SetupSuite() {
    s.testDB = utils.NewTestDB(s.T())
    s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
    s.repo = courseInfra.NewCourseRepository(s.testDB.Logger)
}
```

**Function-based mocks** (in `tests/mocks/`):

```go
type MockCourseRepository struct {
    CreateFn  func(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error)
    GetByIDFn func(ctx context.Context, tx *sql.Tx, courseID string) (*aggregate.Course, error)
    ListFn    func(ctx context.Context, tx *sql.Tx) ([]*aggregate.Course, error)
}

func (m *MockCourseRepository) Create(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error) {
    return m.CreateFn(ctx, tx, course)
}
```

**Test tips:**
- Seed `auth.users` first for FK constraints
- Compare dates with `.Format("2006-01-02")` to avoid timezone mismatches
- Use `json.RawMessage('{}')` for jsonb fields in test fixtures
- Use `DELETE FROM` (not `TRUNCATE`) in teardown — `internal` role lacks `TRUNCATE` on FK tables

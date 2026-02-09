# Development Guide

This guide walks through implementing a new domain feature using Domain-Driven Design patterns.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Infrastructure](#core-infrastructure)
  - [Transaction Manager](#transaction-manager)
  - [Auth Context](#auth-context)
- [Example: Adding a "Courses" Domain](#example-adding-a-courses-domain)
  - [Step 1: Database Migration](#step-1-database-migration)
  - [Step 2: Domain Errors](#step-2-domain-errors)
  - [Step 3: Aggregate (Domain Entity)](#step-3-aggregate-domain-entity)
  - [Step 4: Repository Interface](#step-4-repository-interface)
  - [Step 5: Repository Implementation](#step-5-repository-implementation)
  - [Step 6: Service (Application Layer)](#step-6-service-application-layer)
  - [Step 7: Handler (HTTP Interface)](#step-7-handler-http-interface)
  - [Step 8: Wire Up Routes](#step-8-wire-up-routes)
- [File Structure](#file-structure)
- [Checklist](#checklist)
- [Testing](#testing)
  - [Shared Mocks](#shared-mocks)
  - [Unit Tests](#unit-tests)
  - [Integration Tests](#integration-tests)
  - [Running Tests](#running-tests)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Request                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Handlers (domain/<name>/handler/)           │
│            Parse request, validate, call service            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Services (domain/<name>/service/)           │
│      Business logic, auth validation, tx orchestration      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Aggregates (domain/<name>/aggregate/)         │
│           Entities, value objects, domain rules             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Repositories (infrastructure/<name>/)           │
│              Database access via Go-Jet models              │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Infrastructure

### Transaction Manager

The `TxManager` provides two transaction types based on PostgreSQL RLS roles:

- **`InAuthTx`** — Sets the `authenticated` role with session variables (`app.current_user_id`, `app.current_role`). Use for **read operations** where RLS policies should filter data per-user.
- **`InSystemTx`** — Sets the `internal` role which bypasses RLS. Use for **write operations** since `authenticated` typically only has `SELECT` grants on domain tables.

```go
// Read — uses authenticated role (RLS filters apply)
err := s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
    result, err = s.repository.GetByID(ctx, tx, id)
    return err
})

// Write — uses internal role (bypasses RLS)
err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
    return s.repository.Update(ctx, tx, schedule)
})
```

### Auth Context

Auth context is propagated via `context.Context` and extracted in the service layer:

```go
// Set by middleware (or test setup)
ctx = database.WithAuthContext(ctx, database.AuthContext{
    UserID: "user-uuid",
    Role:   "admin",
})

// Extracted in service
authCtx, ok := database.AuthContextFromContext(ctx)
```

---

## Example: Adding a "Courses" Domain

---

## Step 1: Database Migration

```bash
task migrate:create -- add_courses
```

### Up Migration

```sql
-- migrations/000004_add_courses.up.sql

CREATE TABLE "schedule"."courses" (
    "course_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "code" varchar(20) NOT NULL UNIQUE,
    "name" varchar(100) NOT NULL,
    "department" varchar(50) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" uuid NOT NULL,
    "updated_at" timestamptz,
    PRIMARY KEY ("course_id"),
    CONSTRAINT "fk_courses_created_by" FOREIGN KEY("created_by") REFERENCES "auth"."users"("user_id")
);

CREATE INDEX "courses_idx_department" ON "schedule"."courses" ("department");

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON "schedule"."courses"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_courses_created_by
    BEFORE INSERT ON "schedule"."courses"
    FOR EACH ROW EXECUTE FUNCTION set_created_by();

-- RLS
ALTER TABLE "schedule"."courses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "schedule"."courses" FORCE ROW LEVEL SECURITY;

CREATE POLICY internal_bypass_courses ON "schedule"."courses"
    TO internal USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY courses_select ON "schedule"."courses"
    FOR SELECT TO authenticated USING (TRUE);

GRANT SELECT ON "schedule"."courses" TO authenticated;
GRANT ALL ON "schedule"."courses" TO internal;
```

### Down Migration

```sql
-- migrations/000004_add_courses.down.sql

DROP POLICY IF EXISTS courses_select ON "schedule"."courses";
DROP POLICY IF EXISTS internal_bypass_courses ON "schedule"."courses";
DROP TRIGGER IF EXISTS trg_courses_created_by ON "schedule"."courses";
DROP TRIGGER IF EXISTS trg_courses_updated_at ON "schedule"."courses";
DROP INDEX IF EXISTS "schedule"."courses_idx_department";
DROP TABLE IF EXISTS "schedule"."courses";
```

### Apply & Generate

```bash
task migrate:up
task generate:models
```

---

## Step 2: Domain Errors

Define domain errors in a separate package so they can be imported without circular dependencies.

```go
// backend/internal/domain/course/errors/course_errors.go
package errors

import "errors"

var (
    ErrNotFound            = errors.New("course not found")
    ErrInvalidCode         = errors.New("course code is required")
    ErrInvalidName         = errors.New("course name is required")
    ErrMissingAuthContext  = errors.New("missing authentication context")
)
```

---

## Step 3: Aggregate (Domain Entity)

The aggregate contains the domain entity, business rules, and model conversion helpers.

```go
// backend/internal/domain/course/aggregate/course_aggregate.go
package aggregate

import (
    "strings"
    "time"

    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
    "github.com/google/uuid"
)

type Course struct {
    CourseID   uuid.UUID
    Code       string
    Name       string
    Department string
    IsActive   bool
    CreatedAt  time.Time
    CreatedBy  uuid.UUID
    UpdatedAt  *time.Time
}

func NewCourse(code, name, department string) (*Course, error) {
    if strings.TrimSpace(code) == "" {
        return nil, courseErrors.ErrInvalidCode
    }
    if strings.TrimSpace(name) == "" {
        return nil, courseErrors.ErrInvalidName
    }

    return &Course{
        CourseID:   uuid.New(),
        Code:       code,
        Name:       name,
        Department: department,
        IsActive:   true,
    }, nil
}

func (c *Course) Deactivate() {
    c.IsActive = false
}

func (c *Course) Activate() {
    c.IsActive = true
}

// ToModel maps the aggregate to a database model
func (c *Course) ToModel() model.Courses {
    return model.Courses{
        CourseID:   c.CourseID,
        Code:       c.Code,
        Name:       c.Name,
        Department: c.Department,
        IsActive:   c.IsActive,
        CreatedAt:  c.CreatedAt,
        CreatedBy:  c.CreatedBy,
        UpdatedAt:  c.UpdatedAt,
    }
}

// CourseFromModel maps a database model to the aggregate
func CourseFromModel(m model.Courses) Course {
    return Course{
        CourseID:   m.CourseID,
        Code:       m.Code,
        Name:       m.Name,
        Department: m.Department,
        IsActive:   m.IsActive,
        CreatedAt:  m.CreatedAt,
        CreatedBy:  m.CreatedBy,
        UpdatedAt:  m.UpdatedAt,
    }
}
```

---

## Step 4: Repository Interface

Define the repository interface in the domain layer. Every method takes a `*sql.Tx` — the service layer manages transactions.

```go
// backend/internal/domain/course/repository/course_repository_interface.go
package repository

import (
    "context"
    "database/sql"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
    "github.com/google/uuid"
)

type CourseRepositoryInterface interface {
    Create(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error)
    GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Course, error)
    List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Course, error)
    Update(ctx context.Context, tx *sql.Tx, course *aggregate.Course) error
}
```

---

## Step 5: Repository Implementation

Implement using Go-Jet generated models. Use `postgres.UUID()` for UUID column comparisons (not `postgres.String()`).

```go
// backend/internal/infrastructure/course/course_repository.go
package course

import (
    "context"
    "database/sql"
    "errors"
    "fmt"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/domain/course/repository"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/table"
    "github.com/go-jet/jet/v2/postgres"
    "github.com/go-jet/jet/v2/qrm"
    "github.com/google/uuid"
    "go.uber.org/zap"
)

var _ repository.CourseRepositoryInterface = (*CourseRepository)(nil)

type CourseRepository struct {
    logger *zap.Logger
}

func NewCourseRepository(logger *zap.Logger) repository.CourseRepositoryInterface {
    return &CourseRepository{logger: logger}
}

func (r *CourseRepository) Create(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error) {
    m := course.ToModel()

    stmt := table.Courses.INSERT(
        table.Courses.CourseID,
        table.Courses.Code,
        table.Courses.Name,
        table.Courses.Department,
        table.Courses.CreatedBy,
    ).MODEL(m).RETURNING(table.Courses.AllColumns)

    var result model.Courses
    err := stmt.QueryContext(ctx, tx, &result)
    if err != nil {
        r.logger.Error("failed to create course", zap.Error(err))
        return nil, fmt.Errorf("failed to create course: %w", err)
    }

    c := aggregate.CourseFromModel(result)
    return &c, nil
}

func (r *CourseRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Course, error) {
    stmt := table.Courses.
        SELECT(table.Courses.AllColumns).
        WHERE(table.Courses.CourseID.EQ(postgres.UUID(id)))

    var result model.Courses
    err := stmt.QueryContext(ctx, tx, &result)
    if err != nil {
        if errors.Is(err, qrm.ErrNoRows) {
            return nil, courseErrors.ErrNotFound
        }
        return nil, fmt.Errorf("failed to get course by ID: %w", err)
    }

    c := aggregate.CourseFromModel(result)
    return &c, nil
}

func (r *CourseRepository) Update(ctx context.Context, tx *sql.Tx, course *aggregate.Course) error {
    m := course.ToModel()

    stmt := table.Courses.UPDATE(
        table.Courses.Name,
        table.Courses.Department,
        table.Courses.IsActive,
    ).MODEL(m).WHERE(table.Courses.CourseID.EQ(postgres.UUID(m.CourseID)))

    result, err := stmt.ExecContext(ctx, tx)
    if err != nil {
        return fmt.Errorf("failed to update course: %w", err)
    }

    rowsAffected, err := result.RowsAffected()
    if err != nil {
        return fmt.Errorf("failed to check rows affected: %w", err)
    }
    if rowsAffected == 0 {
        return courseErrors.ErrNotFound
    }

    return nil
}
```

---

## Step 6: Service (Application Layer)

The service validates auth context, orchestrates transactions, and applies business logic. Use `InAuthTx` for reads, `InSystemTx` for writes.

```go
// backend/internal/domain/course/service/course_service.go
package service

import (
    "context"
    "database/sql"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/domain/course/repository"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
    "github.com/google/uuid"
    "go.uber.org/zap"
)

type CourseServiceInterface interface {
    Create(ctx context.Context, course *aggregate.Course) (*aggregate.Course, error)
    GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Course, error)
    List(ctx context.Context) ([]*aggregate.Course, error)
    Deactivate(ctx context.Context, id uuid.UUID) error
}

type CourseService struct {
    logger     *zap.Logger
    repository repository.CourseRepositoryInterface
    txManager  database.TxManagerInterface
}

func NewCourseService(logger *zap.Logger, repository repository.CourseRepositoryInterface, txManager database.TxManagerInterface) *CourseService {
    return &CourseService{
        logger:     logger,
        repository: repository,
        txManager:  txManager,
    }
}

func (s *CourseService) authCtx(ctx context.Context) (database.AuthContext, error) {
    authCtx, ok := database.AuthContextFromContext(ctx)
    if !ok {
        s.logger.Error("missing auth context in request")
        return database.AuthContext{}, courseErrors.ErrMissingAuthContext
    }
    return authCtx, nil
}

// Create — write operation, uses InSystemTx
func (s *CourseService) Create(ctx context.Context, course *aggregate.Course) (*aggregate.Course, error) {
    s.logger.Info("creating course", zap.String("code", course.Code))

    authCtx, err := s.authCtx(ctx)
    if err != nil {
        return nil, err
    }

    userID, err := uuid.Parse(authCtx.UserID)
    if err != nil {
        s.logger.Error("invalid user ID in auth context", zap.Error(err))
        return nil, courseErrors.ErrMissingAuthContext
    }
    course.CreatedBy = userID

    var result *aggregate.Course
    err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
        var txErr error
        result, txErr = s.repository.Create(ctx, tx, course)
        return txErr
    })
    if err != nil {
        s.logger.Error("failed to create course", zap.Error(err))
        return nil, err
    }

    s.logger.Info("course created", zap.String("course_id", result.CourseID.String()))
    return result, nil
}

// GetByID — read operation, uses InAuthTx
func (s *CourseService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Course, error) {
    s.logger.Debug("getting course by ID", zap.String("course_id", id.String()))

    authCtx, err := s.authCtx(ctx)
    if err != nil {
        return nil, err
    }

    var result *aggregate.Course
    err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
        var txErr error
        result, txErr = s.repository.GetByID(ctx, tx, id)
        return txErr
    })
    if err != nil {
        s.logger.Error("failed to get course", zap.Error(err))
        return nil, err
    }

    return result, nil
}

// Deactivate — write operation, uses InSystemTx
func (s *CourseService) Deactivate(ctx context.Context, id uuid.UUID) error {
    s.logger.Info("deactivating course", zap.String("course_id", id.String()))

    if _, err := s.authCtx(ctx); err != nil {
        return err
    }

    err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
        course, txErr := s.repository.GetByID(ctx, tx, id)
        if txErr != nil {
            return txErr
        }
        course.Deactivate()
        return s.repository.Update(ctx, tx, course)
    })
    if err != nil {
        s.logger.Error("failed to deactivate course", zap.Error(err))
        return err
    }

    s.logger.Info("course deactivated", zap.String("course_id", id.String()))
    return nil
}
```

---

## Step 7: Handler (HTTP Interface)

The handler parses HTTP requests, calls the service, and returns JSON responses. DTOs live in a separate file. Routes are registered via `RegisterRoutes(r chi.Router)`.

### DTOs

```go
// backend/internal/domain/course/handler/course_dtos.go
package handler

import (
    "time"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
)

type CreateCourseRequest struct {
    Code       string `json:"code"`
    Name       string `json:"name"`
    Department string `json:"department"`
}

type CourseResponse struct {
    CourseID   string     `json:"course_id"`
    Code       string     `json:"code"`
    Name       string     `json:"name"`
    Department string     `json:"department"`
    IsActive   bool       `json:"is_active"`
    CreatedAt  time.Time  `json:"created_at"`
    CreatedBy  string     `json:"created_by"`
    UpdatedAt  *time.Time `json:"updated_at"`
}

func courseToResponse(c *aggregate.Course) CourseResponse {
    return CourseResponse{
        CourseID:   c.CourseID.String(),
        Code:       c.Code,
        Name:       c.Name,
        Department: c.Department,
        IsActive:   c.IsActive,
        CreatedAt:  c.CreatedAt,
        CreatedBy:  c.CreatedBy.String(),
        UpdatedAt:  c.UpdatedAt,
    }
}
```

### Handler

```go
// backend/internal/domain/course/handler/course_handler.go
package handler

import (
    "encoding/json"
    "errors"
    "net/http"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course/aggregate"
    courseErrors "github.com/HDR3604/HelpDeskApp/internal/domain/course/errors"
    "github.com/HDR3604/HelpDeskApp/internal/domain/course/service"
    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"
    "go.uber.org/zap"
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
        r.Post("/", h.Create)
        r.Get("/", h.List)
        r.Get("/{id}", h.GetByID)
        r.Patch("/{id}/deactivate", h.Deactivate)
    })
}

func (h *CourseHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateCourseRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        writeError(w, http.StatusBadRequest, "invalid request body")
        return
    }

    course, err := aggregate.NewCourse(req.Code, req.Name, req.Department)
    if err != nil {
        writeError(w, http.StatusBadRequest, err.Error())
        return
    }

    created, err := h.service.Create(r.Context(), course)
    if err != nil {
        h.handleServiceError(w, err)
        return
    }

    writeJSON(w, http.StatusCreated, courseToResponse(created))
}

func (h *CourseHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    id, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid course ID")
        return
    }

    course, err := h.service.GetByID(r.Context(), id)
    if err != nil {
        h.handleServiceError(w, err)
        return
    }

    writeJSON(w, http.StatusOK, courseToResponse(course))
}

func (h *CourseHandler) handleServiceError(w http.ResponseWriter, err error) {
    switch {
    case errors.Is(err, courseErrors.ErrNotFound):
        writeError(w, http.StatusNotFound, err.Error())
    case errors.Is(err, courseErrors.ErrInvalidCode),
        errors.Is(err, courseErrors.ErrInvalidName):
        writeError(w, http.StatusBadRequest, err.Error())
    case errors.Is(err, courseErrors.ErrMissingAuthContext):
        writeError(w, http.StatusUnauthorized, "unauthorized")
    default:
        h.logger.Error("unhandled service error", zap.Error(err))
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

## Step 8: Wire Up Routes

### Register in `routes.go`

Handlers register their own routes via `RegisterRoutes`. Mount them under the `/api/v1` group:

```go
// backend/internal/application/routes.go
func registerRoutes(r *chi.Mux, scheduleHdl *scheduleHandler.ScheduleHandler, courseHdl *courseHandler.CourseHandler) {
    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        fmt.Fprintln(w, "OK")
    })

    r.Route("/api/v1", func(r chi.Router) {
        scheduleHdl.RegisterRoutes(r)
        courseHdl.RegisterRoutes(r)
    })
}
```

### Wire in `app.go`

Instantiate repository, service, and handler in `NewApp`:

```go
// In NewApp():
courseRepository := courseRepo.NewCourseRepository(logger)
courseSvc := courseService.NewCourseService(logger, courseRepository, txManager)
courseHdl := courseHandler.NewCourseHandler(logger, courseSvc)

registerRoutes(r, scheduleHdl, courseHdl)
```

---

## File Structure

```
backend/internal/
├── application/
│   ├── app.go              # App setup, wiring, server
│   ├── config.go           # Environment config loading
│   └── routes.go           # Route registration
├── domain/
│   └── course/
│       ├── aggregate/
│       │   └── course_aggregate.go    # Entity + business rules + model mapping
│       ├── errors/
│       │   └── course_errors.go       # Domain errors
│       ├── handler/
│       │   ├── course_handler.go      # HTTP handler + route registration
│       │   └── course_dtos.go         # Request/response DTOs + conversion
│       ├── repository/
│       │   └── course_repository_interface.go  # Repository interface
│       └── service/
│           └── course_service.go      # Service interface + implementation
├── infrastructure/
│   ├── database/
│   │   ├── tx_manager.go             # InAuthTx / InSystemTx
│   │   └── tx_manager_types.go       # AuthContext, context helpers
│   ├── course/
│   │   └── course_repository.go      # Go-Jet repository implementation
│   └── models/                       # Generated by Go-Jet (do not edit)
└── tests/
    ├── mocks/
    │   ├── mock_tx_manager.go         # StubTxManager (executes fn with nil tx)
    │   ├── mock_course_repository.go  # Function-based mock
    │   └── mock_course_service.go     # Function-based mock
    ├── integration/
    │   └── course/
    │       └── course_repository_test.go
    ├── unit/
    │   └── domains/
    │       └── course/
    │           ├── course_test.go              # Aggregate unit tests
    │           ├── course_service_test.go       # Service unit tests
    │           └── course_handler_test.go       # Handler unit tests
    └── utils/
        └── test_db.go                 # Testcontainers PostgreSQL setup
```

---

## Checklist

When implementing a new domain:

- [ ] **Migration**: Create up/down SQL files with triggers, RLS policies, and grants
- [ ] **Generate**: Run `task migrate:up` then `task generate:models`
- [ ] **Errors**: Define domain errors in `domain/<name>/errors/`
- [ ] **Aggregate**: Define entity with business rules and model mapping in `domain/<name>/aggregate/`
- [ ] **Repository Interface**: Define in `domain/<name>/repository/`
- [ ] **Repository Impl**: Implement with Go-Jet in `infrastructure/<name>/` (use `postgres.UUID()` for UUID comparisons)
- [ ] **Service**: Business logic with auth + tx management in `domain/<name>/service/`
- [ ] **Handler + DTOs**: HTTP interface in `domain/<name>/handler/`
- [ ] **Routes**: Wire up in `application/routes.go` and `application/app.go`
- [ ] **Mocks**: Add function-based mocks in `tests/mocks/`
- [ ] **Unit Tests**: Aggregate, service (with mock repo), handler (with mock service + Chi router)
- [ ] **Integration Tests**: Repository tests with testcontainers

---

## Testing

### Shared Mocks

Mocks live in `tests/mocks/` and use a function-based pattern. Each mock field can be set per test case:

```go
// backend/internal/tests/mocks/mock_course_repository.go
package mocks

type MockCourseRepository struct {
    CreateFn  func(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error)
    GetByIDFn func(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Course, error)
    ListFn    func(ctx context.Context, tx *sql.Tx) ([]*aggregate.Course, error)
    UpdateFn  func(ctx context.Context, tx *sql.Tx, course *aggregate.Course) error
}

func (m *MockCourseRepository) Create(ctx context.Context, tx *sql.Tx, course *aggregate.Course) (*aggregate.Course, error) {
    return m.CreateFn(ctx, tx, course)
}
// ... other methods delegate to their Fn fields
```

The `StubTxManager` executes transaction functions directly with a `nil` tx (since the repository is also mocked in unit tests):

```go
type StubTxManager struct{}

func (s *StubTxManager) InAuthTx(_ context.Context, _ database.AuthContext, fn func(tx *sql.Tx) error) error {
    return fn(nil)
}

func (s *StubTxManager) InSystemTx(_ context.Context, fn func(tx *sql.Tx) error) error {
    return fn(nil)
}
```

### Unit Tests

All unit tests use `testify/suite`:

```go
// Service test — uses mock repository + stub tx manager
type CourseServiceTestSuite struct {
    suite.Suite
    repo    *mocks.MockCourseRepository
    service service.CourseServiceInterface
    authCtx context.Context
}

func (s *CourseServiceTestSuite) SetupTest() {
    s.repo = &mocks.MockCourseRepository{}
    svc := service.NewCourseService(zap.NewNop(), s.repo, &mocks.StubTxManager{})
    s.service = svc
    s.authCtx = database.WithAuthContext(context.Background(), database.AuthContext{
        UserID: uuid.New().String(),
        Role:   "admin",
    })
}

// Handler test — uses mock service + Chi router
type CourseHandlerTestSuite struct {
    suite.Suite
    mockSvc *mocks.MockCourseService
    router  *chi.Mux
}

func (s *CourseHandlerTestSuite) SetupTest() {
    s.mockSvc = &mocks.MockCourseService{}
    hdl := handler.NewCourseHandler(zap.NewNop(), s.mockSvc)
    s.router = chi.NewRouter()
    s.router.Route("/api/v1", func(r chi.Router) {
        hdl.RegisterRoutes(r)
    })
}
```

### Integration Tests

Integration tests use testcontainers to spin up a real PostgreSQL instance with migrations:

```go
type CourseRepositoryTestSuite struct {
    suite.Suite
    testDB    *utils.TestDB
    txManager database.TxManagerInterface
    repo      *courseRepo.CourseRepository
    ctx       context.Context
    userID    uuid.UUID
}

func (s *CourseRepositoryTestSuite) SetupSuite() {
    s.testDB = utils.NewTestDB(s.T())
    s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
    s.repo = courseRepo.NewCourseRepository(s.testDB.Logger).(*courseRepo.CourseRepository)
    s.ctx = context.Background()

    // Seed a user for the created_by FK
    s.userID = uuid.New()
    _ = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
        _, err := tx.ExecContext(s.ctx,
            `INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
            s.userID, "test@test.com", "hashed", "admin",
        )
        return err
    })
}

func (s *CourseRepositoryTestSuite) TearDownTest() {
    s.testDB.Truncate(s.T(), "schedule.courses")
}
```

### Running Tests

```bash
# All tests (unit + integration)
go test ./... -count=1

# Unit tests only
go test ./internal/tests/unit/... -count=1

# Integration tests only (requires Docker)
go test ./internal/tests/integration/... -v -count=1

# Specific domain
go test ./internal/tests/unit/domains/schedule/... -v

# Build + vet + test
go build ./... && go vet ./... && go test ./... -count=1
```

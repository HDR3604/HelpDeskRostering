# Development Guide

This guide walks through implementing a new domain feature using Domain-Driven Design patterns.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Core Infrastructure](#core-infrastructure)
  - [Logging with Zap](#logging-with-zap)
- [Example: Adding a "Courses" Domain](#example-adding-a-courses-domain)
  - [Step 1: Database Migration](#step-1-database-migration)
  - [Step 2: Aggregate (Domain Entity)](#step-2-aggregate-domain-entity)
  - [Step 3: Repository Interface](#step-3-repository-interface)
  - [Step 4: Service (Application Layer)](#step-4-service-application-layer)
  - [Step 5: Repository Implementation](#step-5-repository-implementation)
  - [Step 6: Handler (HTTP Interface)](#step-6-handler-http-interface)
  - [Step 7: Wire Up Routes](#step-7-wire-up-routes)
- [File Structure](#file-structure)
- [Checklist](#checklist)
- [Testing](#testing)
  - [Test Infrastructure](#test-infrastructure)
  - [Writing Integration Tests](#writing-integration-tests)
  - [Running Tests](#running-tests)
  - [Test Patterns](#test-patterns)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      HTTP Request                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Handlers (interfaces/)                  │
│            Parse request, validate, call service            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Services (domain/)                      │
│              Business logic, orchestration                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Aggregates (domain/)                      │
│           Entities, value objects, domain rules             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Repositories (infrastructure/)              │
│              Database access via jet models                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Infrastructure

### Logging with Zap

All services use structured logging via `go.uber.org/zap`.

```go
// backend/internal/infrastructure/logger/logger.go
package logger

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func New(env string) (*zap.Logger, error) {
    var config zap.Config

    if env == "production" {
        config = zap.NewProductionConfig()
    } else {
        config = zap.NewDevelopmentConfig()
        config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
    }

    return config.Build()
}
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
-- backend/migrations/000003_add_courses.up.sql

CREATE TABLE "schedule"."courses" (
    "course_id" uuid NOT NULL DEFAULT gen_random_uuid(),
    "code" varchar(20) NOT NULL UNIQUE,
    "name" varchar(100) NOT NULL,
    "department" varchar(50) NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" timestamptz NOT NULL,
    "updated_at" timestamptz,
    PRIMARY KEY ("course_id")
);

CREATE INDEX "courses_idx_department" ON "schedule"."courses" ("department");

CREATE TRIGGER trg_courses_created_at
    BEFORE INSERT ON "schedule"."courses"
    FOR EACH ROW EXECUTE FUNCTION set_created_at();

CREATE TRIGGER trg_courses_updated_at
    BEFORE UPDATE ON "schedule"."courses"
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

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
-- backend/migrations/000003_add_courses.down.sql

DROP POLICY IF EXISTS courses_select ON "schedule"."courses";
DROP POLICY IF EXISTS internal_bypass_courses ON "schedule"."courses";
DROP TRIGGER IF EXISTS trg_courses_updated_at ON "schedule"."courses";
DROP TRIGGER IF EXISTS trg_courses_created_at ON "schedule"."courses";
DROP INDEX IF EXISTS "schedule"."courses_idx_department";
DROP TABLE IF EXISTS "schedule"."courses";
```

### Apply & Generate

```bash
task migrate:up
task generate:models
```

---

## Step 2: Aggregate (Domain Entity)

The aggregate is the core domain object with its business rules.

```go
// backend/internal/domain/course/aggregate.go
package course

import (
    "errors"
    "time"

    "github.com/google/uuid"
)

// Domain errors
var (
    ErrNotFound      = errors.New("course not found")
    ErrCodeExists    = errors.New("course code already exists")
    ErrInvalidCode   = errors.New("course code is required")
    ErrInvalidName   = errors.New("course name is required")
)

// Course is the aggregate root
type Course struct {
    ID         uuid.UUID
    Code       string
    Name       string
    Department string
    IsActive   bool
    CreatedAt  time.Time
    UpdatedAt  *time.Time
}

// NewCourse creates a new course with validation
func NewCourse(code, name, department string) (*Course, error) {
    if code == "" {
        return nil, ErrInvalidCode
    }
    if name == "" {
        return nil, ErrInvalidName
    }

    return &Course{
        ID:         uuid.New(),
        Code:       code,
        Name:       name,
        Department: department,
        IsActive:   true,
    }, nil
}

// Deactivate marks the course as inactive
func (c *Course) Deactivate() {
    c.IsActive = false
}

// Activate marks the course as active
func (c *Course) Activate() {
    c.IsActive = true
}

// UpdateDetails updates course information
func (c *Course) UpdateDetails(name, department *string) {
    if name != nil {
        c.Name = *name
    }
    if department != nil {
        c.Department = *department
    }
}
```

### Value Objects (if needed)

```go
// backend/internal/domain/course/value_objects.go
package course

// CourseCode is a value object for validated course codes
type CourseCode string

func NewCourseCode(code string) (CourseCode, error) {
    if code == "" {
        return "", ErrInvalidCode
    }
    if len(code) > 20 {
        return "", errors.New("course code too long")
    }
    return CourseCode(code), nil
}

func (c CourseCode) String() string {
    return string(c)
}
```

---

## Step 3: Repository Interface

Define the repository interface in the domain layer. This keeps the domain independent of infrastructure.

```go
// backend/internal/domain/course/repository.go
package course

import (
    "context"
    "database/sql"

    "github.com/google/uuid"
)

// Filter for listing courses
type Filter struct {
    Department *string
    IsActive   *bool
    Limit      int
    Offset     int
}

// Repository defines persistence operations.
// tx parameter is optional - pass nil to use direct DB connection.
type Repository interface {
    // Create persists a new course
    Create(ctx context.Context, tx *sql.Tx, course *Course) error

    // GetByID retrieves a course by ID
    GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*Course, error)

    // GetByCode retrieves a course by code
    GetByCode(ctx context.Context, tx *sql.Tx, code string) (*Course, error)

    // List retrieves courses matching the filter
    List(ctx context.Context, tx *sql.Tx, filter Filter) ([]*Course, error)

    // Update persists changes to a course
    Update(ctx context.Context, tx *sql.Tx, course *Course) error

    // Delete removes a course
    Delete(ctx context.Context, tx *sql.Tx, id uuid.UUID) error
}
```

---

## Step 4: Service (Application Layer)

The service orchestrates use cases, enforces business rules, and manages transactions.

```go
// backend/internal/domain/course/service.go
package course

import (
    "context"

    "github.com/google/uuid"
    "go.uber.org/zap"

    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
)

// CreateInput contains data for creating a course
type CreateInput struct {
    Code       string
    Name       string
    Department string
}

// UpdateInput contains data for updating a course
type UpdateInput struct {
    Name       *string
    Department *string
    IsActive   *bool
}

// Service handles course business logic
type Service struct {
    repo      Repository
    txManager *database.TxManager
    logger    *zap.Logger
}

// NewService creates a new course service
func NewService(repo Repository, txManager *database.TxManager, logger *zap.Logger) *Service {
    return &Service{
        repo:      repo,
        txManager: txManager,
        logger:    logger.Named("course"),
    }
}

// Create creates a new course (requires system access to create)
func (s *Service) Create(ctx context.Context, input CreateInput) (*Course, error) {
    s.logger.Info("creating course", zap.String("code", input.Code))

    // Check for duplicate code
    existing, err := s.repo.GetByCode(ctx, nil, input.Code)
    if err != nil && err != ErrNotFound {
        s.logger.Error("failed to check existing course", zap.Error(err))
        return nil, err
    }
    if existing != nil {
        s.logger.Warn("course code already exists", zap.String("code", input.Code))
        return nil, ErrCodeExists
    }

    // Create aggregate
    course, err := NewCourse(input.Code, input.Name, input.Department)
    if err != nil {
        return nil, err
    }

    // Persist within system transaction (admin operation)
    err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
        return s.repo.Create(ctx, tx, course)
    })
    if err != nil {
        s.logger.Error("failed to create course", zap.Error(err))
        return nil, err
    }

    s.logger.Info("course created", zap.String("id", course.ID.String()))
    return course, nil
}

// GetByID retrieves a course by ID
func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (*Course, error) {
    s.logger.Debug("fetching course", zap.String("id", id.String()))

    var course *Course
    err := s.txManager.ReadOnly(ctx, func(db *sql.DB) error {
        var err error
        course, err = s.repo.GetByID(ctx, nil, id)
        return err
    })
    if err != nil {
        s.logger.Error("failed to fetch course", zap.Error(err))
        return nil, err
    }
    return course, nil
}

// List retrieves courses with optional filtering
func (s *Service) List(ctx context.Context, filter Filter) ([]*Course, error) {
    s.logger.Debug("listing courses", zap.Any("filter", filter))

    var courses []*Course
    err := s.txManager.ReadOnly(ctx, func(db *sql.DB) error {
        var err error
        courses, err = s.repo.List(ctx, nil, filter)
        return err
    })
    if err != nil {
        s.logger.Error("failed to list courses", zap.Error(err))
        return nil, err
    }
    return courses, nil
}

// Update updates a course
func (s *Service) Update(ctx context.Context, id uuid.UUID, input UpdateInput) (*Course, error) {
    s.logger.Info("updating course", zap.String("id", id.String()))

    var course *Course
    err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
        var err error
        course, err = s.repo.GetByID(ctx, tx, id)
        if err != nil {
            return err
        }

        // Apply changes via aggregate methods
        course.UpdateDetails(input.Name, input.Department)

        if input.IsActive != nil {
            if *input.IsActive {
                course.Activate()
            } else {
                course.Deactivate()
            }
        }

        // Persist within the same transaction
        return s.repo.Update(ctx, tx, course)
    })

    if err != nil {
        s.logger.Error("failed to update course", zap.Error(err))
        return nil, err
    }

    s.logger.Info("course updated", zap.String("id", id.String()))
    return course, nil
}

// Delete removes a course
func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
    s.logger.Info("deleting course", zap.String("id", id.String()))

    err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
        return s.repo.Delete(ctx, tx, id)
    })

    if err != nil {
        s.logger.Error("failed to delete course", zap.Error(err))
        return err
    }

    s.logger.Info("course deleted", zap.String("id", id.String()))
    return nil
}
```

---

## Step 5: Repository Implementation

Implement the repository interface using jet-generated models.

```go
// backend/internal/infrastructure/repository/course_repository.go
package repository

import (
    "context"
    "database/sql"
    "errors"

    "github.com/go-jet/jet/v2/qrm"
    "github.com/google/uuid"
    . "github.com/go-jet/jet/v2/postgres"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/table"
)

type CourseRepository struct {
    db *sql.DB
}

func NewCourseRepository(db *sql.DB) *CourseRepository {
    return &CourseRepository{db: db}
}

// queryable returns the transaction if provided, otherwise returns the db connection.
// This allows repository methods to work with or without an active transaction.
func (r *CourseRepository) queryable(tx *sql.Tx) qrm.Queryable {
    if tx != nil {
        return tx
    }
    return r.db
}

func (r *CourseRepository) Create(ctx context.Context, tx *sql.Tx, c *course.Course) error {
    stmt := table.Courses.INSERT(
        table.Courses.CourseID,
        table.Courses.Code,
        table.Courses.Name,
        table.Courses.Department,
        table.Courses.IsActive,
    ).VALUES(
        c.ID,
        c.Code,
        c.Name,
        c.Department,
        c.IsActive,
    )

    _, err := stmt.ExecContext(ctx, r.queryable(tx))
    return err
}

func (r *CourseRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*course.Course, error) {
    stmt := SELECT(table.Courses.AllColumns).
        FROM(table.Courses).
        WHERE(table.Courses.CourseID.EQ(UUID(id)))

    var dest model.Courses
    err := stmt.QueryContext(ctx, r.queryable(tx), &dest)
    if err != nil {
        if errors.Is(err, qrm.ErrNoRows) {
            return nil, course.ErrNotFound
        }
        return nil, err
    }

    return r.toDomain(&dest), nil
}

func (r *CourseRepository) GetByCode(ctx context.Context, tx *sql.Tx, code string) (*course.Course, error) {
    stmt := SELECT(table.Courses.AllColumns).
        FROM(table.Courses).
        WHERE(table.Courses.Code.EQ(String(code)))

    var dest model.Courses
    err := stmt.QueryContext(ctx, r.queryable(tx), &dest)
    if err != nil {
        if errors.Is(err, qrm.ErrNoRows) {
            return nil, course.ErrNotFound
        }
        return nil, err
    }

    return r.toDomain(&dest), nil
}

func (r *CourseRepository) List(ctx context.Context, tx *sql.Tx, filter course.Filter) ([]*course.Course, error) {
    stmt := SELECT(table.Courses.AllColumns).FROM(table.Courses)

    var conditions []BoolExpression
    if filter.Department != nil {
        conditions = append(conditions, table.Courses.Department.EQ(String(*filter.Department)))
    }
    if filter.IsActive != nil {
        conditions = append(conditions, table.Courses.IsActive.EQ(Bool(*filter.IsActive)))
    }

    if len(conditions) > 0 {
        stmt = stmt.WHERE(AND(conditions...))
    }

    stmt = stmt.ORDER_BY(table.Courses.Code.ASC())

    if filter.Limit > 0 {
        stmt = stmt.LIMIT(int64(filter.Limit))
    }
    if filter.Offset > 0 {
        stmt = stmt.OFFSET(int64(filter.Offset))
    }

    var dest []model.Courses
    err := stmt.QueryContext(ctx, r.queryable(tx), &dest)
    if err != nil {
        return nil, err
    }

    courses := make([]*course.Course, len(dest))
    for i := range dest {
        courses[i] = r.toDomain(&dest[i])
    }

    return courses, nil
}

func (r *CourseRepository) Update(ctx context.Context, tx *sql.Tx, c *course.Course) error {
    stmt := table.Courses.UPDATE(
        table.Courses.Name,
        table.Courses.Department,
        table.Courses.IsActive,
    ).SET(
        c.Name,
        c.Department,
        c.IsActive,
    ).WHERE(table.Courses.CourseID.EQ(UUID(c.ID)))

    _, err := stmt.ExecContext(ctx, r.queryable(tx))
    return err
}

func (r *CourseRepository) Delete(ctx context.Context, tx *sql.Tx, id uuid.UUID) error {
    stmt := table.Courses.DELETE().
        WHERE(table.Courses.CourseID.EQ(UUID(id)))

    _, err := stmt.ExecContext(ctx, r.queryable(tx))
    return err
}

// toDomain maps database model to domain aggregate
func (r *CourseRepository) toDomain(m *model.Courses) *course.Course {
    return &course.Course{
        ID:         m.CourseID,
        Code:       m.Code,
        Name:       m.Name,
        Department: m.Department,
        IsActive:   m.IsActive,
        CreatedAt:  m.CreatedAt,
        UpdatedAt:  m.UpdatedAt,
    }
}
```

---

## Step 6: Handler (HTTP Interface)

The handler translates HTTP requests to service calls and formats responses.

```go
// backend/internal/interfaces/http/course_handler.go
package http

import (
    "encoding/json"
    "net/http"
    "strconv"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/google/uuid"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course"
)

type CourseHandler struct {
    service *course.Service
}

func NewCourseHandler(service *course.Service) *CourseHandler {
    return &CourseHandler{service: service}
}

// Request DTOs
type CreateCourseRequest struct {
    Code       string `json:"code"`
    Name       string `json:"name"`
    Department string `json:"department"`
}

type UpdateCourseRequest struct {
    Name       *string `json:"name,omitempty"`
    Department *string `json:"department,omitempty"`
    IsActive   *bool   `json:"is_active,omitempty"`
}

// Response DTOs
type CourseResponse struct {
    ID         string  `json:"id"`
    Code       string  `json:"code"`
    Name       string  `json:"name"`
    Department string  `json:"department"`
    IsActive   bool    `json:"is_active"`
    CreatedAt  string  `json:"created_at"`
    UpdatedAt  *string `json:"updated_at,omitempty"`
}

type ErrorResponse struct {
    Error string `json:"error"`
}

// Create handles POST /api/courses
func (h *CourseHandler) Create(w http.ResponseWriter, r *http.Request) {
    var req CreateCourseRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.writeError(w, "invalid request body", http.StatusBadRequest)
        return
    }

    c, err := h.service.Create(r.Context(), course.CreateInput{
        Code:       req.Code,
        Name:       req.Name,
        Department: req.Department,
    })
    if err != nil {
        h.handleError(w, err)
        return
    }

    h.writeJSON(w, http.StatusCreated, h.toResponse(c))
}

// GetByID handles GET /api/courses/{id}
func (h *CourseHandler) GetByID(w http.ResponseWriter, r *http.Request) {
    id, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        h.writeError(w, "invalid id", http.StatusBadRequest)
        return
    }

    c, err := h.service.GetByID(r.Context(), id)
    if err != nil {
        h.handleError(w, err)
        return
    }

    h.writeJSON(w, http.StatusOK, h.toResponse(c))
}

// List handles GET /api/courses
func (h *CourseHandler) List(w http.ResponseWriter, r *http.Request) {
    filter := course.Filter{}

    if dept := r.URL.Query().Get("department"); dept != "" {
        filter.Department = &dept
    }
    if active := r.URL.Query().Get("is_active"); active != "" {
        b := active == "true"
        filter.IsActive = &b
    }
    if limit := r.URL.Query().Get("limit"); limit != "" {
        if l, err := strconv.Atoi(limit); err == nil {
            filter.Limit = l
        }
    }

    courses, err := h.service.List(r.Context(), filter)
    if err != nil {
        h.handleError(w, err)
        return
    }

    response := make([]CourseResponse, len(courses))
    for i, c := range courses {
        response[i] = *h.toResponse(c)
    }

    h.writeJSON(w, http.StatusOK, response)
}

// Update handles PUT /api/courses/{id}
func (h *CourseHandler) Update(w http.ResponseWriter, r *http.Request) {
    id, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        h.writeError(w, "invalid id", http.StatusBadRequest)
        return
    }

    var req UpdateCourseRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        h.writeError(w, "invalid request body", http.StatusBadRequest)
        return
    }

    c, err := h.service.Update(r.Context(), id, course.UpdateInput{
        Name:       req.Name,
        Department: req.Department,
        IsActive:   req.IsActive,
    })
    if err != nil {
        h.handleError(w, err)
        return
    }

    h.writeJSON(w, http.StatusOK, h.toResponse(c))
}

// Delete handles DELETE /api/courses/{id}
func (h *CourseHandler) Delete(w http.ResponseWriter, r *http.Request) {
    id, err := uuid.Parse(chi.URLParam(r, "id"))
    if err != nil {
        h.writeError(w, "invalid id", http.StatusBadRequest)
        return
    }

    if err := h.service.Delete(r.Context(), id); err != nil {
        h.handleError(w, err)
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

// Helper methods

func (h *CourseHandler) handleError(w http.ResponseWriter, err error) {
    switch err {
    case course.ErrNotFound:
        h.writeError(w, "course not found", http.StatusNotFound)
    case course.ErrCodeExists:
        h.writeError(w, "course code already exists", http.StatusConflict)
    case course.ErrInvalidCode, course.ErrInvalidName:
        h.writeError(w, err.Error(), http.StatusBadRequest)
    default:
        h.writeError(w, "internal server error", http.StatusInternalServerError)
    }
}

func (h *CourseHandler) writeJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func (h *CourseHandler) writeError(w http.ResponseWriter, message string, status int) {
    h.writeJSON(w, status, ErrorResponse{Error: message})
}

func (h *CourseHandler) toResponse(c *course.Course) *CourseResponse {
    resp := &CourseResponse{
        ID:         c.ID.String(),
        Code:       c.Code,
        Name:       c.Name,
        Department: c.Department,
        IsActive:   c.IsActive,
        CreatedAt:  c.CreatedAt.Format(time.RFC3339),
    }
    if c.UpdatedAt != nil {
        s := c.UpdatedAt.Format(time.RFC3339)
        resp.UpdatedAt = &s
    }
    return resp
}
```

---

## Step 7: Wire Up Routes

```go
// backend/internal/application/routes.go
package application

import (
    "database/sql"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    "go.uber.org/zap"

    "github.com/HDR3604/HelpDeskApp/internal/domain/course"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
    "github.com/HDR3604/HelpDeskApp/internal/infrastructure/repository"
    httpHandler "github.com/HDR3604/HelpDeskApp/internal/interfaces/http"
)

func SetupRoutes(r chi.Router, db *sql.DB, txManager *database.TxManager, logger *zap.Logger) {
    // Middleware
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.RequestID)

    // Courses domain
    courseRepo := repository.NewCourseRepository(db)
    courseService := course.NewService(courseRepo, txManager, logger)
    courseHandler := httpHandler.NewCourseHandler(courseService)

    r.Route("/api/courses", func(r chi.Router) {
        r.Post("/", courseHandler.Create)
        r.Get("/", courseHandler.List)
        r.Get("/{id}", courseHandler.GetByID)
        r.Put("/{id}", courseHandler.Update)
        r.Delete("/{id}", courseHandler.Delete)
    })
}
```

---

## File Structure

```
backend/internal/
├── domain/
│   └── course/
│       ├── aggregate.go      # Course entity + business rules
│       ├── repository.go     # Repository interface
│       ├── service.go        # Application service
│       └── value_objects.go  # Value objects (optional)
├── infrastructure/
│   ├── models/               # Generated by jet
│   │   └── helpdesk/
│   │       └── schedule/
│   │           ├── model/courses.go
│   │           └── table/courses.go
│   └── repository/
│       └── course_repository.go
├── interfaces/
│   └── http/
│       └── course_handler.go
└── application/
    └── routes.go
```

---

## Checklist

When implementing a new domain:

- [ ] **Migration**: Create up/down SQL files with RLS policies
- [ ] **Generate**: Run `task generate:models`
- [ ] **Aggregate**: Define entity with business rules in `domain/<name>/aggregate.go`
- [ ] **Repository Interface**: Define in `domain/<name>/repository.go`
- [ ] **Service**: Business logic in `domain/<name>/service.go`
- [ ] **Repository Impl**: Database access in `infrastructure/repository/<name>_repository.go`
- [ ] **Handler**: HTTP interface in `interfaces/http/<name>_handler.go`
- [ ] **Routes**: Wire up in `application/routes.go`
- [ ] **Tests**: Unit tests for service, integration tests for repository

---

## Testing

### Test Infrastructure

Integration tests use [testcontainers-go](https://golang.testcontainers.org/) to spin up a PostgreSQL container with migrations applied.

```go
// backend/internal/tests/utils/test_db.go
package utils

import (
    "testing"
    "github.com/golang-migrate/migrate/v4"
    "github.com/testcontainers/testcontainers-go/modules/postgres"
)

type TestDB struct {
    DB        *sql.DB
    Logger    *zap.Logger
    ctx       context.Context
    container *postgres.PostgresContainer
}

func NewTestDB(t *testing.T) *TestDB {
    // Starts PostgreSQL container, runs migrations, returns connected DB
    // Cleanup is automatic via t.Cleanup()
}

func (tdb *TestDB) Truncate(t *testing.T, tables ...string) {
    // Truncates specified tables between tests
}
```

### Writing Integration Tests

Use testify/suite for organized test setup:

```go
package myfeature_test

import (
    "testing"
    "github.com/stretchr/testify/suite"
    "github.com/HDR3604/HelpDeskApp/internal/tests/utils"
)

type MyFeatureTestSuite struct {
    suite.Suite
    testDB *utils.TestDB
    ctx    context.Context
}

func TestMyFeatureTestSuite(t *testing.T) {
    suite.Run(t, new(MyFeatureTestSuite))
}

func (s *MyFeatureTestSuite) SetupSuite() {
    s.testDB = utils.NewTestDB(s.T())
    s.ctx = context.Background()
}

func (s *MyFeatureTestSuite) TestSomething() {
    // Use s.testDB.DB for queries
    s.Require().NoError(err)
}
```

### Running Tests

```bash
# Run all tests
task test

# Run specific test
go test -v ./internal/tests/integration/...

# Run with race detection
go test -race ./...
```

### Test Patterns

**Direct database queries:**

```go
func (s *MySuite) TestInsert() {
    _, err := s.testDB.DB.ExecContext(s.ctx, "INSERT INTO ...")
    s.Require().NoError(err)
}

func (s *MySuite) TestQuery() {
    var result string
    err := s.testDB.DB.QueryRowContext(s.ctx, "SELECT ...").Scan(&result)
    s.Require().NoError(err)
}
```

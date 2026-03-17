package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/google/uuid"
)

var _ repository.TimeLogRepositoryInterface = (*MockTimeLogRepository)(nil)

// MockTimeLogRepository provides function-based mocking for the time log repository.
// Set the Fn fields to control return values per test case.
type MockTimeLogRepository struct {
	CreateFn             func(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error)
	GetByIDFn            func(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.TimeLog, error)
	GetOpenByStudentIDFn func(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.TimeLog, error)
	UpdateFn             func(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error)
	ListFn               func(ctx context.Context, tx *sql.Tx, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error)
	ListByStudentIDFn    func(ctx context.Context, tx *sql.Tx, studentID int32, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, error)
}

func (m *MockTimeLogRepository) Create(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error) {
	return m.CreateFn(ctx, tx, timeLog)
}

func (m *MockTimeLogRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.TimeLog, error) {
	return m.GetByIDFn(ctx, tx, id)
}

func (m *MockTimeLogRepository) GetOpenByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.TimeLog, error) {
	return m.GetOpenByStudentIDFn(ctx, tx, studentID)
}

func (m *MockTimeLogRepository) Update(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error) {
	return m.UpdateFn(ctx, tx, timeLog)
}

func (m *MockTimeLogRepository) List(ctx context.Context, tx *sql.Tx, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error) {
	return m.ListFn(ctx, tx, filter)
}

func (m *MockTimeLogRepository) ListByStudentID(ctx context.Context, tx *sql.Tx, studentID int32, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, error) {
	return m.ListByStudentIDFn(ctx, tx, studentID, filter)
}

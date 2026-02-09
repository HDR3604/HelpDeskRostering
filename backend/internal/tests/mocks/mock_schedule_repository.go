package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/google/uuid"
)

var _ repository.ScheduleRepositoryInterface = (*MockScheduleRepository)(nil)

// MockScheduleRepository provides function-based mocking for the schedule repository.
// Set the Fn fields to control return values per test case.
type MockScheduleRepository struct {
	CreateFn       func(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error)
	GetByIDFn      func(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Schedule, error)
	GetActiveFn    func(ctx context.Context, tx *sql.Tx) (*aggregate.Schedule, error)
	ListArchivedFn func(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error)
	ListFn         func(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error)
	UpdateFn       func(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) error
}

func (m *MockScheduleRepository) Create(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
	return m.CreateFn(ctx, tx, schedule)
}

func (m *MockScheduleRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Schedule, error) {
	return m.GetByIDFn(ctx, tx, id)
}

func (m *MockScheduleRepository) GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.Schedule, error) {
	return m.GetActiveFn(ctx, tx)
}

func (m *MockScheduleRepository) ListArchived(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error) {
	return m.ListArchivedFn(ctx, tx)
}

func (m *MockScheduleRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error) {
	return m.ListFn(ctx, tx)
}

func (m *MockScheduleRepository) Update(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) error {
	return m.UpdateFn(ctx, tx, schedule)
}

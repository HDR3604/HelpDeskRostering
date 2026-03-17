package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
)

var _ repository.ClockInCodeRepositoryInterface = (*MockClockInCodeRepository)(nil)

// MockClockInCodeRepository provides function-based mocking for the clock-in code repository.
// Set the Fn fields to control return values per test case.
type MockClockInCodeRepository struct {
	CreateFn        func(ctx context.Context, tx *sql.Tx, code *aggregate.ClockInCode) (*aggregate.ClockInCode, error)
	GetByCodeFn     func(ctx context.Context, tx *sql.Tx, code string) (*aggregate.ClockInCode, error)
	GetActiveFn     func(ctx context.Context, tx *sql.Tx) (*aggregate.ClockInCode, error)
	DeleteExpiredFn func(ctx context.Context, tx *sql.Tx) error
}

func (m *MockClockInCodeRepository) Create(ctx context.Context, tx *sql.Tx, code *aggregate.ClockInCode) (*aggregate.ClockInCode, error) {
	return m.CreateFn(ctx, tx, code)
}

func (m *MockClockInCodeRepository) GetByCode(ctx context.Context, tx *sql.Tx, code string) (*aggregate.ClockInCode, error) {
	return m.GetByCodeFn(ctx, tx, code)
}

func (m *MockClockInCodeRepository) GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.ClockInCode, error) {
	return m.GetActiveFn(ctx, tx)
}

func (m *MockClockInCodeRepository) DeleteExpired(ctx context.Context, tx *sql.Tx) error {
	return m.DeleteExpiredFn(ctx, tx)
}

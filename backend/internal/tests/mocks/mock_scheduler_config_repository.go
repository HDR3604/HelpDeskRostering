package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/google/uuid"
)

var _ repository.SchedulerConfigRepositoryInterface = (*MockSchedulerConfigRepository)(nil)

type MockSchedulerConfigRepository struct {
	CreateFn     func(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error)
	GetByIDFn    func(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error)
	GetDefaultFn func(ctx context.Context, tx *sql.Tx) (*aggregate.SchedulerConfig, error)
	ListFn       func(ctx context.Context, tx *sql.Tx) ([]*aggregate.SchedulerConfig, error)
	UpdateFn     func(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) error
}

func (m *MockSchedulerConfigRepository) Create(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
	return m.CreateFn(ctx, tx, c)
}

func (m *MockSchedulerConfigRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
	return m.GetByIDFn(ctx, tx, id)
}

func (m *MockSchedulerConfigRepository) GetDefault(ctx context.Context, tx *sql.Tx) (*aggregate.SchedulerConfig, error) {
	return m.GetDefaultFn(ctx, tx)
}

func (m *MockSchedulerConfigRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.SchedulerConfig, error) {
	return m.ListFn(ctx, tx)
}

func (m *MockSchedulerConfigRepository) Update(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) error {
	return m.UpdateFn(ctx, tx, c)
}

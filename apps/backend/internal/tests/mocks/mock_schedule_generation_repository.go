package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/google/uuid"
)

var _ repository.ScheduleGenerationRepositoryInterface = (*MockScheduleGenerationRepository)(nil)

type MockScheduleGenerationRepository struct {
	CreateFn  func(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) (*aggregate.ScheduleGeneration, error)
	GetByIDFn func(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ScheduleGeneration, error)
	ListFn    func(ctx context.Context, tx *sql.Tx) ([]*aggregate.ScheduleGeneration, error)
	UpdateFn  func(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) error
}

func (m *MockScheduleGenerationRepository) Create(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) (*aggregate.ScheduleGeneration, error) {
	return m.CreateFn(ctx, tx, generation)
}

func (m *MockScheduleGenerationRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
	return m.GetByIDFn(ctx, tx, id)
}

func (m *MockScheduleGenerationRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.ScheduleGeneration, error) {
	return m.ListFn(ctx, tx)
}

func (m *MockScheduleGenerationRepository) Update(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) error {
	return m.UpdateFn(ctx, tx, generation)
}

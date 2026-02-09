package schedule

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

var _ repository.ScheduleRepositoryInterface = (*ScheduleRepository)(nil)

type ScheduleRepository struct {
	logger *zap.Logger
}

func NewScheduleRepository(logger *zap.Logger) repository.ScheduleRepositoryInterface {
	return &ScheduleRepository{
		logger: logger,
	}
}

func (r *ScheduleRepository) Create(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
	return nil, nil
}

func (r *ScheduleRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Schedule, error) {
	return nil, nil
}

func (r *ScheduleRepository) GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.Schedule, error) {
	return nil, nil
}

func (r *ScheduleRepository) ListArchived(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error) {
	return nil, nil
}

func (r *ScheduleRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error) {
	return nil, nil
}

func (r *ScheduleRepository) Update(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) error {
	return nil
}

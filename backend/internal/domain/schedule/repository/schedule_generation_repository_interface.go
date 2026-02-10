package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/google/uuid"
)

type ScheduleGenerationRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) (*aggregate.ScheduleGeneration, error)
	GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ScheduleGeneration, error)
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.ScheduleGeneration, error)
	Update(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) error
}

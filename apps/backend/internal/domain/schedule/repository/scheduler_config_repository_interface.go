package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/google/uuid"
)

type SchedulerConfigRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error)
	GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error)
	GetDefault(ctx context.Context, tx *sql.Tx) (*aggregate.SchedulerConfig, error)
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.SchedulerConfig, error)
	Update(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) error
}

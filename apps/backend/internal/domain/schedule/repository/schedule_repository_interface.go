package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/google/uuid"
)

type ScheduleRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error)
	GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Schedule, error)
	GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.Schedule, error)
	ListArchived(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error)
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error)
	Update(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) error
}

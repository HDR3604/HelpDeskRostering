package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/google/uuid"
)

type ShiftTemplateRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error)
	BulkCreate(ctx context.Context, tx *sql.Tx, templates []*aggregate.ShiftTemplate) ([]*aggregate.ShiftTemplate, error)
	GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ShiftTemplate, error)
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error)    // active only
	ListAll(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error) // including inactive
	Update(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) error
}

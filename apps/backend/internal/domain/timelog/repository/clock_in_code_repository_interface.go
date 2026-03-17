package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
)

type ClockInCodeRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, code *aggregate.ClockInCode) (*aggregate.ClockInCode, error)
	GetByCode(ctx context.Context, tx *sql.Tx, code string) (*aggregate.ClockInCode, error)
	GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.ClockInCode, error)
	DeleteExpired(ctx context.Context, tx *sql.Tx) error
}

package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/google/uuid"
)

type AuthTokenRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, token *aggregate.AuthToken) (*aggregate.AuthToken, error)
	GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string, tokenType string) (*aggregate.AuthToken, error)
	InvalidateAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID, tokenType string) error
	DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time, tokenType string) (int64, error)
}

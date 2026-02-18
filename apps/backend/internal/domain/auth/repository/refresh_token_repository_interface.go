package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/google/uuid"
)

type RefreshTokenRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, refreshToken *aggregate.RefreshToken) (*aggregate.RefreshToken, error)
	GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.RefreshToken, error) // returns regardless of status
	RevokeByID(ctx context.Context, tx *sql.Tx, tokenID uuid.UUID, replacedBy *uuid.UUID) error
	RevokeAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error
	DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error)
}

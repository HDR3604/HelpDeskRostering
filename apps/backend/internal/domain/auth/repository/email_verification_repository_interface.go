package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/google/uuid"
)

type EmailVerificationRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, verification *aggregate.EmailVerification) (*aggregate.EmailVerification, error)
	GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.EmailVerification, error)
	InvalidateAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error
	DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error)
}

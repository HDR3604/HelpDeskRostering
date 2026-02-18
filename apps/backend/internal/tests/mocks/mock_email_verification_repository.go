package mocks

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/repository"
	"github.com/google/uuid"
)

type MockEmailVerificationRepository struct {
	CreateFn               func(ctx context.Context, tx *sql.Tx, verification *aggregate.EmailVerification) (*aggregate.EmailVerification, error)
	GetByTokenHashFn       func(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.EmailVerification, error)
	InvalidateAllByUserIDFn func(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error
	DeleteExpiredFn        func(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error)
}

var _ repository.EmailVerificationRepositoryInterface = (*MockEmailVerificationRepository)(nil)

func (m *MockEmailVerificationRepository) Create(ctx context.Context, tx *sql.Tx, verification *aggregate.EmailVerification) (*aggregate.EmailVerification, error) {
	return m.CreateFn(ctx, tx, verification)
}

func (m *MockEmailVerificationRepository) GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.EmailVerification, error) {
	return m.GetByTokenHashFn(ctx, tx, tokenHash)
}

func (m *MockEmailVerificationRepository) InvalidateAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error {
	return m.InvalidateAllByUserIDFn(ctx, tx, userID)
}

func (m *MockEmailVerificationRepository) DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error) {
	return m.DeleteExpiredFn(ctx, tx, beforeTime)
}

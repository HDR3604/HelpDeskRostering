package mocks

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/repository"
	"github.com/google/uuid"
)

type MockAuthTokenRepository struct {
	CreateFn                func(ctx context.Context, tx *sql.Tx, token *aggregate.AuthToken) (*aggregate.AuthToken, error)
	GetByTokenHashFn        func(ctx context.Context, tx *sql.Tx, tokenHash string, tokenType string) (*aggregate.AuthToken, error)
	InvalidateAllByUserIDFn func(ctx context.Context, tx *sql.Tx, userID uuid.UUID, tokenType string) error
	DeleteExpiredFn         func(ctx context.Context, tx *sql.Tx, beforeTime time.Time, tokenType string) (int64, error)
}

var _ repository.AuthTokenRepositoryInterface = (*MockAuthTokenRepository)(nil)

func (m *MockAuthTokenRepository) Create(ctx context.Context, tx *sql.Tx, token *aggregate.AuthToken) (*aggregate.AuthToken, error) {
	return m.CreateFn(ctx, tx, token)
}

func (m *MockAuthTokenRepository) GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string, tokenType string) (*aggregate.AuthToken, error) {
	return m.GetByTokenHashFn(ctx, tx, tokenHash, tokenType)
}

func (m *MockAuthTokenRepository) InvalidateAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID, tokenType string) error {
	return m.InvalidateAllByUserIDFn(ctx, tx, userID, tokenType)
}

func (m *MockAuthTokenRepository) DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time, tokenType string) (int64, error) {
	return m.DeleteExpiredFn(ctx, tx, beforeTime, tokenType)
}

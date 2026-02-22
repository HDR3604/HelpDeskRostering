package mocks

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/repository"
	"github.com/google/uuid"
)

type MockRefreshTokenRepository struct {
	CreateFn           func(ctx context.Context, tx *sql.Tx, token *aggregate.RefreshToken) (*aggregate.RefreshToken, error)
	GetByTokenHashFn   func(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.RefreshToken, error)
	RevokeByIDFn       func(ctx context.Context, tx *sql.Tx, tokenID uuid.UUID, replacedBy *uuid.UUID) error
	RevokeAllByUserIDFn func(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error
	DeleteExpiredFn    func(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error)
}

var _ repository.RefreshTokenRepositoryInterface = (*MockRefreshTokenRepository)(nil)

func (m *MockRefreshTokenRepository) Create(ctx context.Context, tx *sql.Tx, token *aggregate.RefreshToken) (*aggregate.RefreshToken, error) {
	return m.CreateFn(ctx, tx, token)
}

func (m *MockRefreshTokenRepository) GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.RefreshToken, error) {
	return m.GetByTokenHashFn(ctx, tx, tokenHash)
}

func (m *MockRefreshTokenRepository) RevokeByID(ctx context.Context, tx *sql.Tx, tokenID uuid.UUID, replacedBy *uuid.UUID) error {
	return m.RevokeByIDFn(ctx, tx, tokenID, replacedBy)
}

func (m *MockRefreshTokenRepository) RevokeAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error {
	return m.RevokeAllByUserIDFn(ctx, tx, userID)
}

func (m *MockRefreshTokenRepository) DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error) {
	return m.DeleteExpiredFn(ctx, tx, beforeTime)
}

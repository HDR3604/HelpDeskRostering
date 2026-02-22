package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"go.uber.org/zap"
)

var _ repository.RefreshTokenRepositoryInterface = (*RefreshTokenRepository)(nil)

type RefreshTokenRepository struct {
	logger *zap.Logger
}

func NewRefreshTokenRepository(logger *zap.Logger) repository.RefreshTokenRepositoryInterface {
	return &RefreshTokenRepository{logger: logger}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, tx *sql.Tx, token *aggregate.RefreshToken) (*aggregate.RefreshToken, error) {
	m := token.ToModel()

	stmt := table.RefreshTokens.INSERT(
		table.RefreshTokens.ID,
		table.RefreshTokens.UserID,
		table.RefreshTokens.TokenHash,
		table.RefreshTokens.ExpiresAt,
	).VALUES(
		m.ID,
		m.UserID,
		m.TokenHash,
		m.ExpiresAt,
	).RETURNING(table.RefreshTokens.AllColumns)

	var created model.RefreshTokens
	err := stmt.QueryContext(ctx, tx, &created)
	if err != nil {
		r.logger.Error("failed to create refresh token", zap.Error(err))
		return nil, fmt.Errorf("failed to create refresh token: %w", err)
	}

	return aggregate.RefreshTokenFromModel(&created), nil
}

func (r *RefreshTokenRepository) GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.RefreshToken, error) {
	stmt := table.RefreshTokens.SELECT(table.RefreshTokens.AllColumns).
		WHERE(table.RefreshTokens.TokenHash.EQ(postgres.String(tokenHash)))

	var token model.RefreshTokens
	err := stmt.QueryContext(ctx, tx, &token)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, authErrors.ErrInvalidRefreshToken
		}
		r.logger.Error("failed to get refresh token by hash", zap.Error(err))
		return nil, fmt.Errorf("failed to get refresh token by hash: %w", err)
	}

	return aggregate.RefreshTokenFromModel(&token), nil
}

func (r *RefreshTokenRepository) RevokeByID(ctx context.Context, tx *sql.Tx, tokenID uuid.UUID, replacedBy *uuid.UUID) error {
	now := time.Now()

	stmt := table.RefreshTokens.UPDATE(
		table.RefreshTokens.RevokedAt,
		table.RefreshTokens.ReplacedBy,
	).SET(
		now,
		replacedBy,
	).WHERE(table.RefreshTokens.ID.EQ(postgres.UUID(tokenID)))

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to revoke refresh token", zap.Error(err))
		return fmt.Errorf("failed to revoke refresh token: %w", err)
	}

	return nil
}

func (r *RefreshTokenRepository) RevokeAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error {
	now := time.Now()

	stmt := table.RefreshTokens.UPDATE(
		table.RefreshTokens.RevokedAt,
	).SET(
		now,
	).WHERE(
		table.RefreshTokens.UserID.EQ(postgres.UUID(userID)).
			AND(table.RefreshTokens.RevokedAt.IS_NULL()),
	)

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to revoke all refresh tokens for user", zap.Error(err))
		return fmt.Errorf("failed to revoke all refresh tokens: %w", err)
	}

	return nil
}

func (r *RefreshTokenRepository) DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error) {
	stmt := table.RefreshTokens.DELETE().
		WHERE(table.RefreshTokens.ExpiresAt.LT(postgres.TimestampzT(beforeTime)))

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to delete expired refresh tokens", zap.Error(err))
		return 0, fmt.Errorf("failed to delete expired refresh tokens: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

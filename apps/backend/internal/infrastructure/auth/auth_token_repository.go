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

var _ repository.AuthTokenRepositoryInterface = (*AuthTokenRepository)(nil)

type AuthTokenRepository struct {
	logger *zap.Logger
}

func NewAuthTokenRepository(logger *zap.Logger) repository.AuthTokenRepositoryInterface {
	return &AuthTokenRepository{logger: logger}
}

func (r *AuthTokenRepository) Create(ctx context.Context, tx *sql.Tx, token *aggregate.AuthToken) (*aggregate.AuthToken, error) {
	m := token.ToModel()

	stmt := table.AuthTokens.INSERT(
		table.AuthTokens.ID,
		table.AuthTokens.UserID,
		table.AuthTokens.TokenHash,
		table.AuthTokens.Type,
		table.AuthTokens.ExpiresAt,
	).VALUES(
		m.ID,
		m.UserID,
		m.TokenHash,
		m.Type,
		m.ExpiresAt,
	).RETURNING(table.AuthTokens.AllColumns)

	var created model.AuthTokens
	err := stmt.QueryContext(ctx, tx, &created)
	if err != nil {
		r.logger.Error("failed to create auth token", zap.Error(err))
		return nil, fmt.Errorf("failed to create auth token: %w", err)
	}

	return aggregate.AuthTokenFromModel(&created), nil
}

func (r *AuthTokenRepository) GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string, tokenType string) (*aggregate.AuthToken, error) {
	stmt := table.AuthTokens.SELECT(table.AuthTokens.AllColumns).
		WHERE(
			table.AuthTokens.TokenHash.EQ(postgres.String(tokenHash)).
				AND(table.AuthTokens.Type.EQ(postgres.String(tokenType))),
		)

	var token model.AuthTokens
	err := stmt.QueryContext(ctx, tx, &token)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, tokenNotFoundError(tokenType)
		}
		r.logger.Error("failed to get auth token by hash", zap.Error(err))
		return nil, fmt.Errorf("failed to get auth token by hash: %w", err)
	}

	return aggregate.AuthTokenFromModel(&token), nil
}

func (r *AuthTokenRepository) InvalidateAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID, tokenType string) error {
	now := time.Now()

	stmt := table.AuthTokens.UPDATE(
		table.AuthTokens.UsedAt,
	).SET(
		now,
	).WHERE(
		table.AuthTokens.UserID.EQ(postgres.UUID(userID)).
			AND(table.AuthTokens.Type.EQ(postgres.String(tokenType))).
			AND(table.AuthTokens.UsedAt.IS_NULL()),
	)

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to invalidate auth tokens for user", zap.Error(err))
		return fmt.Errorf("failed to invalidate auth tokens: %w", err)
	}

	return nil
}

func (r *AuthTokenRepository) DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time, tokenType string) (int64, error) {
	stmt := table.AuthTokens.DELETE().
		WHERE(
			table.AuthTokens.ExpiresAt.LT(postgres.TimestampzT(beforeTime)).
				AND(table.AuthTokens.Type.EQ(postgres.String(tokenType))),
		)

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to delete expired auth tokens", zap.Error(err))
		return 0, fmt.Errorf("failed to delete expired auth tokens: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

func tokenNotFoundError(tokenType string) error {
	switch tokenType {
	case aggregate.AuthTokenType_PasswordReset:
		return authErrors.ErrPasswordResetTokenInvalid
	default:
		return authErrors.ErrVerificationTokenInvalid
	}
}

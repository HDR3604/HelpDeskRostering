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

var _ repository.EmailVerificationRepositoryInterface = (*EmailVerificationRepository)(nil)

type EmailVerificationRepository struct {
	logger *zap.Logger
}

func NewEmailVerificationRepository(logger *zap.Logger) repository.EmailVerificationRepositoryInterface {
	return &EmailVerificationRepository{logger: logger}
}

func (r *EmailVerificationRepository) Create(ctx context.Context, tx *sql.Tx, verification *aggregate.EmailVerification) (*aggregate.EmailVerification, error) {
	m := verification.ToModel()

	stmt := table.EmailVerifications.INSERT(
		table.EmailVerifications.ID,
		table.EmailVerifications.UserID,
		table.EmailVerifications.TokenHash,
		table.EmailVerifications.ExpiresAt,
	).VALUES(
		m.ID,
		m.UserID,
		m.TokenHash,
		m.ExpiresAt,
	).RETURNING(table.EmailVerifications.AllColumns)

	var created model.EmailVerifications
	err := stmt.QueryContext(ctx, tx, &created)
	if err != nil {
		r.logger.Error("failed to create email verification", zap.Error(err))
		return nil, fmt.Errorf("failed to create email verification: %w", err)
	}

	return aggregate.EmailVerificationFromModel(&created), nil
}

func (r *EmailVerificationRepository) GetByTokenHash(ctx context.Context, tx *sql.Tx, tokenHash string) (*aggregate.EmailVerification, error) {
	stmt := table.EmailVerifications.SELECT(table.EmailVerifications.AllColumns).
		WHERE(table.EmailVerifications.TokenHash.EQ(postgres.String(tokenHash)))

	var verification model.EmailVerifications
	err := stmt.QueryContext(ctx, tx, &verification)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, authErrors.ErrVerificationTokenInvalid
		}
		r.logger.Error("failed to get email verification by hash", zap.Error(err))
		return nil, fmt.Errorf("failed to get email verification by hash: %w", err)
	}

	return aggregate.EmailVerificationFromModel(&verification), nil
}

func (r *EmailVerificationRepository) InvalidateAllByUserID(ctx context.Context, tx *sql.Tx, userID uuid.UUID) error {
	now := time.Now()

	stmt := table.EmailVerifications.UPDATE(
		table.EmailVerifications.UsedAt,
	).SET(
		now,
	).WHERE(
		table.EmailVerifications.UserID.EQ(postgres.UUID(userID)).
			AND(table.EmailVerifications.UsedAt.IS_NULL()),
	)

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to invalidate email verifications for user", zap.Error(err))
		return fmt.Errorf("failed to invalidate email verifications: %w", err)
	}

	return nil
}

func (r *EmailVerificationRepository) DeleteExpired(ctx context.Context, tx *sql.Tx, beforeTime time.Time) (int64, error) {
	stmt := table.EmailVerifications.DELETE().
		WHERE(table.EmailVerifications.ExpiresAt.LT(postgres.TimestampzT(beforeTime)))

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to delete expired email verifications", zap.Error(err))
		return 0, fmt.Errorf("failed to delete expired email verifications: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("failed to get rows affected: %w", err)
	}

	return rowsAffected, nil
}

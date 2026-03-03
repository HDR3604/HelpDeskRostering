package verification

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/verification/repository"
	"go.uber.org/zap"
)

var _ repository.VerificationRepositoryInterface = (*VerificationRepository)(nil)

type VerificationRepository struct {
	logger *zap.Logger
}

func NewVerificationRepository(logger *zap.Logger) *VerificationRepository {
	return &VerificationRepository{logger: logger}
}

func (r *VerificationRepository) DeleteByEmail(ctx context.Context, tx *sql.Tx, email string) error {
	_, err := tx.ExecContext(ctx,
		`DELETE FROM public.email_verifications WHERE email = $1`,
		email,
	)
	if err != nil {
		r.logger.Error("failed to delete verification records by email", zap.Error(err), zap.String("email", email))
		return fmt.Errorf("failed to delete verification records: %w", err)
	}
	return nil
}

func (r *VerificationRepository) Insert(ctx context.Context, tx *sql.Tx, v *repository.EmailVerification) error {
	err := tx.QueryRowContext(ctx,
		`INSERT INTO public.email_verifications (email, code_hash, expires_at)
		 VALUES ($1, $2, $3)
		 RETURNING id, created_at`,
		v.Email, v.CodeHash, v.ExpiresAt,
	).Scan(&v.ID, &v.CreatedAt)
	if err != nil {
		r.logger.Error("failed to insert verification record", zap.Error(err), zap.String("email", v.Email))
		return fmt.Errorf("failed to insert verification record: %w", err)
	}
	return nil
}

func (r *VerificationRepository) FindByEmailAndCodeHash(ctx context.Context, tx *sql.Tx, email, codeHash string) (*repository.EmailVerification, error) {
	var v repository.EmailVerification
	err := tx.QueryRowContext(ctx,
		`SELECT id, email, code_hash, expires_at, verified_at, created_at
		 FROM public.email_verifications
		 WHERE email = $1 AND code_hash = $2 AND expires_at > NOW() AND verified_at IS NULL
		 ORDER BY created_at DESC
		 LIMIT 1`,
		email, codeHash,
	).Scan(&v.ID, &v.Email, &v.CodeHash, &v.ExpiresAt, &v.VerifiedAt, &v.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("verification record not found")
		}
		r.logger.Error("failed to find verification record", zap.Error(err), zap.String("email", email))
		return nil, fmt.Errorf("failed to find verification record: %w", err)
	}
	return &v, nil
}

func (r *VerificationRepository) MarkVerified(ctx context.Context, tx *sql.Tx, id string) error {
	_, err := tx.ExecContext(ctx,
		`UPDATE public.email_verifications SET verified_at = NOW() WHERE id = $1`,
		id,
	)
	if err != nil {
		r.logger.Error("failed to mark verification as verified", zap.Error(err), zap.String("id", id))
		return fmt.Errorf("failed to mark verification as verified: %w", err)
	}
	return nil
}

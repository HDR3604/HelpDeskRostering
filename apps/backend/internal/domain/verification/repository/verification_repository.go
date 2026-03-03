package repository

import (
	"context"
	"database/sql"
	"time"
)

type EmailVerification struct {
	ID         string
	Email      string
	CodeHash   string
	ExpiresAt  time.Time
	VerifiedAt *time.Time
	CreatedAt  time.Time
}

type VerificationRepositoryInterface interface {
	DeleteByEmail(ctx context.Context, tx *sql.Tx, email string) error
	Insert(ctx context.Context, tx *sql.Tx, v *EmailVerification) error
	FindByEmailAndCodeHash(ctx context.Context, tx *sql.Tx, email, codeHash string) (*EmailVerification, error)
	MarkVerified(ctx context.Context, tx *sql.Tx, id string) error
}

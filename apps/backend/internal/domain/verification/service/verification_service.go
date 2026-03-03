package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"math/big"
	"time"

	"go.uber.org/zap"

	verificationErrors "github.com/HDR3604/HelpDeskApp/internal/domain/verification/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/verification/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/templates"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
)

const codeExpiryMinutes = 10

type VerificationServiceInterface interface {
	SendCode(ctx context.Context, email string) error
	VerifyCode(ctx context.Context, email, code string) error
}

type VerificationService struct {
	logger      *zap.Logger
	txManager   database.TxManagerInterface
	repo        repository.VerificationRepositoryInterface
	emailSender emailInterfaces.EmailSenderInterface
	fromEmail   string
}

var _ VerificationServiceInterface = (*VerificationService)(nil)

func NewVerificationService(
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	repo repository.VerificationRepositoryInterface,
	emailSender emailInterfaces.EmailSenderInterface,
	fromEmail string,
) *VerificationService {
	return &VerificationService{
		logger:      logger,
		txManager:   txManager,
		repo:        repo,
		emailSender: emailSender,
		fromEmail:   fromEmail,
	}
}

func (s *VerificationService) SendCode(ctx context.Context, email string) error {
	if email == "" {
		return verificationErrors.ErrEmailRequired
	}

	code, err := generateCode()
	if err != nil {
		s.logger.Error("failed to generate verification code", zap.Error(err))
		return fmt.Errorf("failed to generate verification code: %w", err)
	}

	codeHash := hashCode(code)

	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		// Delete any existing verification records for this email
		if err := s.repo.DeleteByEmail(ctx, tx, email); err != nil {
			return fmt.Errorf("failed to delete old verification records: %w", err)
		}

		// Insert new verification record
		v := &repository.EmailVerification{
			Email:     email,
			CodeHash:  codeHash,
			ExpiresAt: time.Now().Add(codeExpiryMinutes * time.Minute),
		}
		if err := s.repo.Insert(ctx, tx, v); err != nil {
			return fmt.Errorf("failed to insert verification record: %w", err)
		}

		return nil
	})
	if err != nil {
		return err
	}

	// Send verification email
	_, err = s.emailSender.Send(ctx, dtos.SendEmailRequest{
		From:    s.fromEmail,
		To:      []string{email},
		Subject: "Your Verification Code - DCIT Help Desk",
		Template: &types.EmailTemplate{
			ID: templates.TemplateID_VerificationCode,
			Variables: map[string]any{
				"VERIFICATION_CODE": code,
				"USER_EMAIL":        email,
			},
		},
	})
	if err != nil {
		s.logger.Error("failed to send verification code email", zap.Error(err), zap.String("email", email))
		return fmt.Errorf("failed to send verification email: %w", err)
	}

	return nil
}

func (s *VerificationService) VerifyCode(ctx context.Context, email, code string) error {
	if email == "" {
		return verificationErrors.ErrEmailRequired
	}
	if code == "" {
		return verificationErrors.ErrCodeRequired
	}

	codeHash := hashCode(code)

	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		v, err := s.repo.FindByEmailAndCodeHash(ctx, tx, email, codeHash)
		if err != nil {
			return verificationErrors.ErrInvalidCode
		}

		if time.Now().After(v.ExpiresAt) {
			return verificationErrors.ErrInvalidCode
		}

		if v.VerifiedAt != nil {
			return verificationErrors.ErrAlreadyVerified
		}

		if err := s.repo.MarkVerified(ctx, tx, v.ID); err != nil {
			return fmt.Errorf("failed to mark verification as verified: %w", err)
		}

		return nil
	})
}

// generateCode generates a cryptographically random 6-digit code.
func generateCode() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(1000000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// hashCode returns the SHA-256 hex digest of the given code.
func hashCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

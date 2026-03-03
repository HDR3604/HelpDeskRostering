package application

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

func seedDefaultAdmin(
	ctx context.Context,
	cfg Config,
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	userRepo repository.UserRepositoryInterface,
) error {
	if cfg.SeedAdminEmail == "" || cfg.SeedAdminPassword == "" {
		return nil
	}

	if cfg.SeedAdminFirstName == "" {
		cfg.SeedAdminFirstName = "Admin"
	}
	if cfg.SeedAdminLastName == "" {
		cfg.SeedAdminLastName = "User"
	}

	return txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		existing, err := userRepo.GetByEmail(ctx, tx, cfg.SeedAdminEmail)
		if err == nil && existing != nil {
			logger.Info("default admin already exists", zap.String("email", cfg.SeedAdminEmail))
			return nil
		}
		if err != nil && !errors.Is(err, userErrors.ErrUserNotFound) {
			return err
		}

		// Build user directly — bypasses email-domain validation since this
		// is a bootstrap seed and the admin email may not match @uwi.edu.
		hashed, err := bcrypt.GenerateFromPassword([]byte(cfg.SeedAdminPassword), 14)
		if err != nil {
			return err
		}

		now := time.Now()
		user := &aggregate.User{
			ID:              uuid.New(),
			FirstName:       cfg.SeedAdminFirstName,
			LastName:        cfg.SeedAdminLastName,
			Email:           cfg.SeedAdminEmail,
			Password:        string(hashed),
			Role:            aggregate.Role_Admin,
			IsActive:        true,
			EmailVerifiedAt: &now,
		}

		_, err = userRepo.Create(ctx, tx, user)
		if err != nil {
			return err
		}

		logger.Info("seeded default admin", zap.String("email", cfg.SeedAdminEmail))
		return nil
	})
}

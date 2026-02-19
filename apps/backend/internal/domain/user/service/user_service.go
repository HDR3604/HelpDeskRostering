package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

type UserService struct {
	logger     *zap.Logger
	txManager  database.TxManagerInterface
	repository repository.UserRepositoryInterface
}

func NewUserService(
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	repository repository.UserRepositoryInterface,
) *UserService {
	return &UserService{
		logger:     logger,
		txManager:  txManager,
		repository: repository,
	}
}

func (s *UserService) HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(hashedBytes), err
}

func (s *UserService) Create(ctx context.Context, email, password string, role aggregate.Role) (*aggregate.User, error) {
	// Validate via aggregate FIRST using plain password, before hashing
	user, err := aggregate.NewUser(email, password, role)
	if err != nil {
		s.logger.Error("failed to validate user input", zap.Error(err))
		return nil, err
	}

	hashedPassword, err := s.HashPassword(password)
	if err != nil {
		s.logger.Error("failed to hash password", zap.Error(err))
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}
	user.Password = hashedPassword

	s.logger.Info("creating user", zap.String("email", email), zap.String("role", string(role)))
	var createdUser *aggregate.User
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var createErr error
		existingEmail, err := s.repository.GetByEmail(ctx, tx, email)
		if err != nil && !errors.Is(err, userErrors.ErrUserNotFound) {
			s.logger.Error("failed to check existing email", zap.String("email", email), zap.Error(err))
			return fmt.Errorf("failed to check existing email: %w", err)
		}
		if existingEmail != nil {
			s.logger.Error("email already exists", zap.String("email", email))
			return userErrors.ErrEmailAlreadyExists
		}
		createdUser, createErr = s.repository.Create(ctx, tx, user)
		return createErr
	})

	return createdUser, err
}

func (s *UserService) GetByID(ctx context.Context, userID string) (*aggregate.User, error) {
	var user *aggregate.User
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var err error
		user, err = s.repository.GetByID(ctx, tx, userID)
		return err
	})
	if err != nil {
		s.logger.Error("failed to get user by ID", zap.String("userID", userID), zap.Error(err))
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	return user, nil
}

func (s *UserService) GetByEmail(ctx context.Context, email string) (*aggregate.User, error) {
	var user *aggregate.User
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var err error
		user, err = s.repository.GetByEmail(ctx, tx, email)
		return err
	})
	if err != nil {
		s.logger.Error("failed to get user by email", zap.String("email", email), zap.Error(err))
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return user, nil
}

func (s *UserService) Update(ctx context.Context, tx *sql.Tx, userID string) error {
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var err error
		existingUser, err := s.repository.GetByID(ctx, tx, userID)
		if err != nil {
			s.logger.Error("failed to get user for update", zap.String("userID", userID), zap.Error(err))
			return fmt.Errorf("failed to get user for update: %w", err)
		} else if existingUser == nil {
			s.logger.Error("user not found for update", zap.String("userID", userID))
			return userErrors.ErrUserNotFound
		} else {
			err = s.repository.Update(ctx, tx, existingUser)
			if err != nil {
				s.logger.Error("failed to update user", zap.String("userID", userID), zap.Error(err))
				return fmt.Errorf("failed to update user: %w", err)
			}
		}
		return err
	})
	return err
}

func (s *UserService) DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, emailDomain aggregate.EmailDomain) error {
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		err := s.repository.DeactivateByEmailDomain(ctx, tx, emailDomain)
		if err != nil {
			s.logger.Error("failed to deactivate users by email domain", zap.String("emailDomain", string(emailDomain)), zap.Error(err))
			return fmt.Errorf("failed to deactivate users by email domain: %w", err)
		}
		return nil
	})
	return err
}

func (s *UserService) List(ctx context.Context) ([]*aggregate.User, error) {
	var users []*aggregate.User
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var err error
		users, err = s.repository.List(ctx, tx)
		return err
	})
	if err != nil {
		s.logger.Error("failed to list users", zap.Error(err))
		return nil, fmt.Errorf("failed to list users: %w", err)
	}
	return users, nil
}

func (s *UserService) ListByRole(ctx context.Context, role string) ([]*aggregate.User, error) {
	var users []*aggregate.User
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var err error
		users, err = s.repository.ListByRole(ctx, tx, role)
		return err
	})
	if err != nil {
		s.logger.Error("failed to list users by role", zap.String("role", role), zap.Error(err))
		return nil, fmt.Errorf("failed to list users by role: %w", err)
	}
	return users, nil
}

func (s *UserService) ListActive(ctx context.Context) ([]*aggregate.User, error) {
	var users []*aggregate.User
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var err error
		users, err = s.repository.ListActive(ctx, tx)
		return err
	})
	if err != nil {
		s.logger.Error("failed to list active users", zap.Error(err))
		return nil, fmt.Errorf("failed to list active users: %w", err)
	}
	return users, nil
}

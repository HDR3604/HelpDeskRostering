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
	_, err := aggregate.NewUser(email, password, role)
	if err != nil {
		s.logger.Error("failed to validate user input", zap.Error(err))
		return nil, err
	}

	hashedPassword, err := s.HashPassword(password)
	if err != nil {
		s.logger.Error("failed to hash password", zap.Error(err))
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	unusedEmail, err := s.repository.GetByEmail(ctx, nil, email)
	if err != nil && !errors.Is(err, userErrors.ErrUserNotFound) {
		s.logger.Error("failed to check existing email", zap.String("email", email), zap.Error(err))
		return nil, fmt.Errorf("failed to check existing email: %w", err)
	}
	if unusedEmail != nil {
		s.logger.Error("email already exists", zap.String("email", email))
		return nil, userErrors.ErrEmailAlreadyExists
	}

	user, err := aggregate.NewUser(email, hashedPassword, role)
	if err != nil {
		s.logger.Error("failed to create user aggregate", zap.String("email", email), zap.Error(err))
		return nil, fmt.Errorf("failed to create user aggregate: %w", err)
	}

	s.logger.Info("creating user", zap.String("email", email), zap.String("role", string(role)))
	var createdUser *aggregate.User
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var createErr error
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

func (s *UserService) Update(ctx context.Context, user *aggregate.User) error {
	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		return s.repository.Update(ctx, tx, user)
	})
}

func (s *UserService) DeactivateByEmailDomain(ctx context.Context, emailDomain aggregate.EmailDomain) error {
	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		return s.repository.DeactivateByEmailDomain(ctx, tx, emailDomain)
	})
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

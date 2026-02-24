package service

import (
	"context"
	"database/sql"
	"errors"

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

type UserServiceInterface interface {
	Create(ctx context.Context, email, password string, role aggregate.Role) (*aggregate.User, error)
	GetByID(ctx context.Context, userID string) (*aggregate.User, error)
	GetByEmail(ctx context.Context, email string) (*aggregate.User, error)
	Update(ctx context.Context, userID string, input UpdateUserInput) error
	DeactivateByEmailDomain(ctx context.Context, emailDomain aggregate.EmailDomain) error
	List(ctx context.Context) ([]*aggregate.User, error)
	ListByRole(ctx context.Context, role string) ([]*aggregate.User, error)
	ListActive(ctx context.Context) ([]*aggregate.User, error)
}

type UpdateUserInput struct {
	Email    *string
	Role     *aggregate.Role
	IsActive *bool
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

func (s *UserService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, userErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

func (s *UserService) HashPassword(password string) (string, error) {
	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(hashedBytes), err
}

func (s *UserService) Create(ctx context.Context, firstName, lastName, email, password string, role aggregate.Role) (*aggregate.User, error) {
	s.logger.Info("creating user", zap.String("email", email), zap.String("role", string(role)))

	user, err := aggregate.NewUser(firstName, lastName, email, password, role)
	if err != nil {
		return nil, err
	}

	hashedPassword, err := s.HashPassword(password)
	if err != nil {
		s.logger.Error("failed to hash password", zap.Error(err))
		return nil, err
	}
	user.Password = hashedPassword

	var result *aggregate.User
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		existing, txErr := s.repository.GetByEmail(ctx, tx, email)
		if txErr != nil && !errors.Is(txErr, userErrors.ErrUserNotFound) {
			return txErr
		}
		if existing != nil {
			return userErrors.ErrEmailAlreadyExists
		}
		var createErr error
		result, createErr = s.repository.Create(ctx, tx, user)
		return createErr
	})
	if err != nil {
		s.logger.Error("failed to create user", zap.String("email", email), zap.Error(err))
		return nil, err
	}

	s.logger.Info("user created", zap.String("email", email))
	return result, nil
}

func (s *UserService) GetByID(ctx context.Context, userID string) (*aggregate.User, error) {
	s.logger.Debug("getting user by ID", zap.String("userID", userID))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.User
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByID(ctx, tx, userID)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get user by ID", zap.String("userID", userID), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *UserService) GetByEmail(ctx context.Context, email string) (*aggregate.User, error) {
	s.logger.Debug("getting user by email", zap.String("email", email))

	var result *aggregate.User
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByEmail(ctx, tx, email)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get user by email", zap.String("email", email), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *UserService) Update(ctx context.Context, userID string, input UpdateUserInput) error {
	s.logger.Info("updating user", zap.String("userID", userID))

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		existingUser, txErr := s.repository.GetByID(ctx, tx, userID)
		if txErr != nil {
			return txErr
		}

		if input.Email != nil {
			if err := existingUser.UpdateEmail(*input.Email); err != nil {
				return err
			}
		}

		if input.Role != nil {
			if err := existingUser.UpdateRole(*input.Role); err != nil {
				return err
			}
		}

		if input.IsActive != nil {
			if *input.IsActive {
				_ = existingUser.Activate()
			} else {
				_ = existingUser.Deactivate()
			}
		}

		return s.repository.Update(ctx, tx, existingUser)
	})
	if err != nil {
		s.logger.Error("failed to update user", zap.String("userID", userID), zap.Error(err))
		return err
	}

	s.logger.Info("user updated", zap.String("userID", userID))
	return nil
}

func (s *UserService) DeactivateByEmailDomain(ctx context.Context, emailDomain aggregate.EmailDomain) error {
	s.logger.Info("deactivating users by email domain", zap.String("emailDomain", string(emailDomain)))

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		return s.repository.DeactivateByEmailDomain(ctx, tx, emailDomain)
	})
	if err != nil {
		s.logger.Error("failed to deactivate users by email domain", zap.String("emailDomain", string(emailDomain)), zap.Error(err))
		return err
	}

	s.logger.Info("users deactivated by email domain", zap.String("emailDomain", string(emailDomain)))
	return nil
}

func (s *UserService) List(ctx context.Context) ([]*aggregate.User, error) {
	s.logger.Debug("listing users")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.User
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.List(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list users", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed users", zap.Int("count", len(result)))
	return result, nil
}

func (s *UserService) ListByRole(ctx context.Context, role string) ([]*aggregate.User, error) {
	s.logger.Debug("listing users by role", zap.String("role", role))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.User
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.ListByRole(ctx, tx, role)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list users by role", zap.String("role", role), zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed users by role", zap.String("role", role), zap.Int("count", len(result)))
	return result, nil
}

func (s *UserService) ListActive(ctx context.Context) ([]*aggregate.User, error) {
	s.logger.Debug("listing active users")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.User
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.ListActive(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list active users", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed active users", zap.Int("count", len(result)))
	return result, nil
}

package user

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"go.uber.org/zap"
)

// UserRepository implements the user.Repository interface
type UserRepository struct {
	logger *zap.Logger
}

// NewUserRepository creates a new user repository
func NewUserRepository(logger *zap.Logger) repository.UserRepositoryInterface {
	return &UserRepository{
		logger: logger,
	}
}

// Create saves a new user and returns the created user with ID
func (r *UserRepository) Create(ctx context.Context, tx *sql.Tx, user *aggregate.User) (*aggregate.User, error) {
	userModel := user.ToModel()

	stmt := table.Users.INSERT(
		table.Users.UserID,
		table.Users.EmailAddress,
		table.Users.Password,
		table.Users.Role,
		table.Users.IsActive,
	).VALUES(
		userModel.UserID,
		userModel.EmailAddress,
		userModel.Password,
		userModel.Role,
		userModel.IsActive,
	).RETURNING(table.Users.AllColumns)

	var createdUser model.Users
	err := stmt.QueryContext(ctx, tx, &createdUser)
	if err != nil {
		r.logger.Error("failed to create user", zap.Error(err))
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return r.toDomain(&createdUser), nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, tx *sql.Tx, userID string) (*aggregate.User, error) {
	parsedID, err := uuid.Parse(userID)
	if err != nil {
		r.logger.Error("failed to get user", zap.Error(err))
		return nil, fmt.Errorf("failed to get user: %w", err)
	}

	stmt := table.Users.SELECT(table.Users.AllColumns).
		WHERE(table.Users.UserID.EQ(postgres.UUID(parsedID)))

	var user model.Users
	err = stmt.QueryContext(ctx, tx, &user)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, userErrors.ErrUserNotFound
		}
		r.logger.Error("failed to get user by ID", zap.Error(err))
		return nil, fmt.Errorf("failed to get user by ID: %w", err)
	}
	return r.toDomain(&user), nil
}

// GetByEmail retrieves a user by email
func (r *UserRepository) GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*aggregate.User, error) {
	stmt := table.Users.SELECT(table.Users.AllColumns).
		WHERE(table.Users.EmailAddress.EQ(postgres.String(email)))

	var user model.Users
	err := stmt.QueryContext(ctx, tx, &user)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, userErrors.ErrUserNotFound
		}
		r.logger.Error("failed to get user by email", zap.Error(err))
		return nil, fmt.Errorf("failed to get user by email: %w", err)
	}
	return r.toDomain(&user), nil
}

// GetStudentIDByEmail returns the student_id for a given email, or nil if not found
func (r *UserRepository) GetStudentIDByEmail(ctx context.Context, tx *sql.Tx, email string) (*string, error) {
	stmt := table.Students.SELECT(table.Students.StudentID).
		WHERE(table.Students.EmailAddress.EQ(postgres.String(email)))

	var student model.Students
	err := stmt.QueryContext(ctx, tx, &student)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, nil
		}
		r.logger.Error("failed to get student ID by email", zap.Error(err))
		return nil, fmt.Errorf("failed to get student ID by email: %w", err)
	}
	sid := fmt.Sprintf("%d", student.StudentID)
	return &sid, nil
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, tx *sql.Tx, user *aggregate.User) error {
	userModel := user.ToModel()

	stmt := table.Users.UPDATE(
		table.Users.EmailAddress,
		table.Users.Password,
		table.Users.Role,
		table.Users.IsActive,
		table.Users.EmailVerifiedAt,
	).SET(
		userModel.EmailAddress,
		userModel.Password,
		userModel.Role,
		userModel.IsActive,
		userModel.EmailVerifiedAt,
	).WHERE(table.Users.UserID.EQ(postgres.UUID(user.ID)))

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to update user", zap.Error(err))
		return fmt.Errorf("failed to update user: %w", err)
	}
	return nil
}

// DeactivateByEmailDomain deactivates all active users with the specified email domain
func (r *UserRepository) DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, emailDomain aggregate.EmailDomain) error {

	stmt := table.Users.UPDATE(
		table.Users.IsActive,
	).SET(
		false,
	).WHERE(
		table.Users.EmailAddress.LIKE(postgres.String("%" + string(emailDomain))).
			AND(table.Users.IsActive.EQ(postgres.Bool(true))),
	)

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to deactivate users by email domain", zap.Error(err))
		return fmt.Errorf("failed to deactivate users by email domain: %w", err)
	}
	return nil
}

// List returns all users
func (r *UserRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error) {
	stmt := table.Users.SELECT(table.Users.AllColumns)

	var users []model.Users
	err := stmt.QueryContext(ctx, tx, &users)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.User{}, nil
		}
		r.logger.Error("failed to list users", zap.Error(err))
		return nil, fmt.Errorf("failed to list users: %w", err)
	}

	return toGenerateAggregates(users), nil
}

// ListByRole returns all users with a specific role
func (r *UserRepository) ListByRole(ctx context.Context, tx *sql.Tx, role string) ([]*aggregate.User, error) {
	stmt := table.Users.SELECT(table.Users.AllColumns).
		WHERE(
			postgres.CAST(table.Users.Role).AS_TEXT().EQ(postgres.String(role)),
		)

	var users []model.Users
	err := stmt.QueryContext(ctx, tx, &users)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.User{}, nil
		}
		r.logger.Error("failed to list users by role", zap.Error(err))
		return nil, fmt.Errorf("failed to list users by role: %w", err)
	}

	return toGenerateAggregates(users), nil
}

// ListActive returns all active users
func (r *UserRepository) ListActive(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error) {
	stmt := table.Users.SELECT(table.Users.AllColumns).
		WHERE(table.Users.IsActive.EQ(postgres.Bool(true)))

	var users []model.Users
	err := stmt.QueryContext(ctx, tx, &users)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.User{}, nil
		}
		r.logger.Error("failed to list active users", zap.Error(err))
		return nil, fmt.Errorf("failed to list active users: %w", err)
	}

	return toGenerateAggregates(users), nil
}

// toDomain converts a database model to an aggregate domain object
func (r *UserRepository) toDomain(m *model.Users) *aggregate.User {
	return aggregate.UserFromModel(m)
}

func toGenerateAggregates(models []model.Users) []*aggregate.User {
	users := make([]*aggregate.User, len(models))
	for i, m := range models {
		u := aggregate.UserFromModel(&m)
		users[i] = u
	}
	return users
}

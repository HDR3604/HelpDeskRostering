package user

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	domainErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	"github.com/go-jet/jet/v2/postgres"
)

// UserRepository implements the user.Repository interface
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *sql.DB) repository.Repository {
	return &UserRepository{db: db}
}

// Create saves a new user and returns the created user with ID
func (r *UserRepository) Create(ctx context.Context, tx *sql.Tx, user *aggregate.User) (*aggregate.User, error) {
	userModel := user.ToModel()
	now := time.Now()
	userModel.CreatedAt = now
	userModel.UpdatedAt = &now

	stmt := table.Users.INSERT(
		table.Users.UserID,
		table.Users.EmailAddress,
		table.Users.Password,
		table.Users.Role,
		table.Users.IsActive,
		table.Users.CreatedAt,
		table.Users.UpdatedAt,
	).VALUES(
		userModel.UserID,
		userModel.EmailAddress,
		userModel.Password,
		userModel.Role,
		userModel.IsActive,
		userModel.CreatedAt,
		userModel.UpdatedAt,
	).RETURNING(table.Users.AllColumns)

	var createdUser model.Users
	err := stmt.QueryContext(ctx, tx, &createdUser)
	if err != nil {
		return nil, err
	}

	return r.toDomain(&createdUser), nil
}

// GetByID retrieves a user by ID
func (r *UserRepository) GetByID(ctx context.Context, tx *sql.Tx, userID string) (*aggregate.User, error) {
	parsedID, err := uuid.Parse(userID)
	if err != nil {
		return nil, domainErrors.ErrInvalidEmail
	}

	stmt := table.Users.SELECT(table.Users.AllColumns).
		WHERE(table.Users.UserID.EQ(postgres.UUID(parsedID)))

	var user model.Users
	err = stmt.QueryContext(ctx, tx, &user)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domainErrors.ErrInvalidEmail
		}
		return nil, err
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
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domainErrors.ErrInvalidEmail
		}
		return nil, err
	}

	return r.toDomain(&user), nil
}

// Update updates an existing user
func (r *UserRepository) Update(ctx context.Context, tx *sql.Tx, user *aggregate.User) error {
	userModel := user.ToModel()
	now := time.Now()
	userModel.UpdatedAt = &now

	stmt := table.Users.UPDATE(
		table.Users.EmailAddress,
		table.Users.Password,
		table.Users.Role,
		table.Users.IsActive,
		table.Users.UpdatedAt,
	).SET(
		userModel.EmailAddress,
		userModel.Password,
		userModel.Role,
		userModel.IsActive,
		now,
	).WHERE(table.Users.UserID.EQ(postgres.UUID(user.ID)))

	_, err := stmt.ExecContext(ctx, tx)
	return err
}

// DeactivateByEmailDomain deactivates all active users with the specified email domain
func (r *UserRepository) DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, emailDomain aggregate.EmailDomain) error {
	now := time.Now()

	stmt := table.Users.UPDATE(
		table.Users.IsActive,
		table.Users.UpdatedAt,
	).SET(
		false,
		now,
	).WHERE(
		table.Users.EmailAddress.LIKE(postgres.String("%" + string(emailDomain))).
			AND(table.Users.IsActive.EQ(postgres.Bool(true))),
	)

	_, err := stmt.ExecContext(ctx, tx)
	return err
}

// List returns users with optional filtering by role and/or is_active
func (r *UserRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error) {
	stmt := table.Users.SELECT(table.Users.AllColumns)

	var users []model.Users
	err := stmt.QueryContext(ctx, tx, &users)
	if err != nil {
		return nil, err
	}

	result := make([]*aggregate.User, len(users))
	for i, u := range users {
		result[i] = r.toDomain(&u)
	}

	return result, nil
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
		return nil, err
	}

	result := make([]*aggregate.User, len(users))
	for i, u := range users {
		result[i] = r.toDomain(&u)
	}

	return result, nil
}

// ListActive returns all active users
func (r *UserRepository) ListActive(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error) {
	stmt := table.Users.SELECT(table.Users.AllColumns).
		WHERE(table.Users.IsActive.EQ(postgres.Bool(true)))

	var users []model.Users
	err := stmt.QueryContext(ctx, tx, &users)
	if err != nil {
		return nil, err
	}

	result := make([]*aggregate.User, len(users))
	for i, u := range users {
		result[i] = r.toDomain(&u)
	}

	return result, nil
}

// toDomain converts a database model to an aggregate domain object
func (r *UserRepository) toDomain(m *model.Users) *aggregate.User {
	return aggregate.UserFromModel(m)
}

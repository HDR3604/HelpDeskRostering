package repository

import (
	"context"

	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
)

type UserRepositoryInterface interface {
	// Create saves a new user and returns the created user with ID
	Create(ctx context.Context, tx *sql.Tx, user *aggregate.User) (*aggregate.User, error)

	// GetByID retrieves a user by ID
	GetByID(ctx context.Context, tx *sql.Tx, userID string) (*aggregate.User, error)

	// GetByEmail retrieves a user by email
	GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*aggregate.User, error)

	// Update updates an existing user
	Update(ctx context.Context, tx *sql.Tx, user *aggregate.User) error

	// Deactivate all Active Users with the specified email domain (e.g., "@my.uwi.edu")
	DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, ed aggregate.EmailDomain) error

	// ListAll returns all users
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error)

	// ListByRole returns all users with a specific role
	ListByRole(ctx context.Context, tx *sql.Tx, role string) ([]*aggregate.User, error)

	// ListActive returns all active users
	ListActive(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error)
}

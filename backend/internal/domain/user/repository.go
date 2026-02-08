package user

import (
	"context"
	"database/sql"
)

type Repository interface {
	// Create saves a new user and returns the created user with ID
	Create(ctx context.Context, tx *sql.Tx, user *User) (*User, error)

	// GetByID retrieves a user by ID
	GetByID(ctx context.Context, tx *sql.Tx, userID string) (*User, error)

	// GetByEmail retrieves a user by email
	GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*User, error)

	// Update updates an existing user
	Update(ctx context.Context, tx *sql.Tx, user *User) error

	//Replacement suggestion for delete user
	//Deactivate all Active Users with the specified email domain (e.g., "@my.uwi.edu")
	//DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, emailDomain string) error

	// ListAll returns all users
	List(ctx context.Context, tx *sql.Tx) ([]*User, error)

	// ListByRole returns all users with a specific role
	ListByRole(ctx context.Context, tx *sql.Tx, role string) ([]*User, error)

	// ListActive returns all active users
	ListActive(ctx context.Context, tx *sql.Tx) ([]*User, error)
}

// Delete deletes a user by ID (soft or hard delete)
//Delete(ctx context.Context, tx *sql.Tx, userID string) error
//Removed Delete method as we are implementing soft delete by setting IsActive to false

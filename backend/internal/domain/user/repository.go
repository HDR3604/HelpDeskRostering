package user

import "context"

type Repository interface {
	// Create saves a new user and returns the created user with ID
	Create(ctx context.Context, user *User) (*User, error)

	// GetByID retrieves a user by ID
	GetByID(ctx context.Context, userID string) (*User, error)

	// GetByEmail retrieves a user by email
	GetByEmail(ctx context.Context, email string) (*User, error)

	// Update updates an existing user
	Update(ctx context.Context, user *User) (*User, error)

	// Delete deletes a user by ID (soft or hard delete)
	Delete(ctx context.Context, userID string) error

	// ListAll returns all users
	ListAll(ctx context.Context) ([]*User, error)

	// ListByRole returns all users with a specific role
	ListByRole(ctx context.Context, role string) ([]*User, error)

	// ListActive returns all active users
	ListActive(ctx context.Context) ([]*User, error)

	// Exists checks if a user with given email exists
	Exists(ctx context.Context, email string) (bool, error)

	// ExistsByID checks if a user with given ID exists
	ExistsByID(ctx context.Context, userID string) (bool, error)
}

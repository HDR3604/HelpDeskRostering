package user

import "errors"

// Domain errors for user operations
var (
	ErrNotFound      = errors.New("user not found")
	ErrEmailExists   = errors.New("email already exists")
	ErrInvalidEmail  = errors.New("invalid email format")
	ErrInvalidRole   = errors.New("invalid role")
	ErrInvalidID     = errors.New("invalid user ID")
	ErrInvalidStatus = errors.New("invalid user status")
)

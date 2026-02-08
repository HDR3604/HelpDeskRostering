package user

import "errors"

// Domain errors for user operations
var (
<<<<<<< HEAD
	ErrNotFound                  = errors.New("user not found")
	ErrEmailExists               = errors.New("email already exists")
	ErrInvalidEmail              = errors.New("invalid email format")
	ErrInvalidRole               = errors.New("invalid role")
	ErrInvalidID                 = errors.New("invalid user ID")
	ErrInvalidStatus             = errors.New("invalid user status")
	ErrInvalidPasswordLength     = errors.New("Password must be at least 6 characters")
	ErrInvalidPasswordComplexity = errors.New("Password must contain at least one letter and one number")
	ErrEmailUnchanged            = errors.New("new email must be different from current email")
	ErrRoleUnchanged             = errors.New("new role must be different from current role")
=======
	ErrNotFound      = errors.New("user not found")
	ErrEmailExists   = errors.New("email already exists")
	ErrInvalidEmail  = errors.New("invalid email format")
	ErrInvalidRole   = errors.New("invalid role")
	ErrInvalidID     = errors.New("invalid user ID")
	ErrInvalidStatus = errors.New("invalid user status")
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
)

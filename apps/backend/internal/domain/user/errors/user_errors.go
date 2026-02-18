package errors

import "errors"

// Domain errors for user operations
var (
	ErrNotFound                  = errors.New("user not found")
	ErrEmailExists               = errors.New("email already exists")
	ErrInvalidEmail              = errors.New("invalid email format")
	ErrEmailNotFound             = errors.New("email not found")
	ErrInvalidRole               = errors.New("invalid role")
	ErrInvalidID                 = errors.New("invalid user ID")
	ErrInvalidStatus             = errors.New("invalid user status")
	ErrInvalidPasswordLength     = errors.New("Password must be at least 6 characters")
	ErrInvalidPasswordComplexity = errors.New("Password must contain at least one letter and one number")
	ErrEmailUnchanged            = errors.New("new email must be different from current email")
	ErrRoleUnchanged             = errors.New("new role must be different from current role")
	ErrEmailAdmin                = errors.New("admin email must end with @uwi.edu")
	ErrEmailStudent              = errors.New("student email must end with @my.uwi.edu")
)

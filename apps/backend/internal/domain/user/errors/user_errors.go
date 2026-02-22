package errors

import "errors"

// Domain errors for user operations
var (
	ErrInvalidEmail              = errors.New("invalid email format")
	ErrInvalidRole               = errors.New("invalid role")
	ErrInvalidPasswordLength     = errors.New("password must be at least 8 characters")
	ErrInvalidPasswordComplexity = errors.New("password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character")
	ErrEmailUnchanged            = errors.New("new email must be different from current email")
	ErrRoleUnchanged             = errors.New("new role must be different from current role")
	ErrEmailAdmin                = errors.New("admin email must end with @uwi.edu")
	ErrEmailStudent              = errors.New("student email must end with @my.uwi.edu")
	ErrCreateUserFailed          = errors.New("failed to create user")
	ErrEmailAlreadyExists        = errors.New("email already exists")
	ErrUserNotFound              = errors.New("user not found")
)

package errors

import "errors"

var (
	ErrInvalidCode     = errors.New("invalid or expired verification code")
	ErrAlreadyVerified = errors.New("email already verified")
	ErrEmailRequired   = errors.New("email is required")
	ErrCodeRequired    = errors.New("verification code is required")
)

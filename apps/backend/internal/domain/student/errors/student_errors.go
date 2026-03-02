package errors

import "errors"

// Domain errors for student domain
var (
	ErrBankingDetailsNotFound = errors.New("banking details not found")
	ErrStudentNotFound        = errors.New("student not found")
	ErrInvalidBankName        = errors.New("invalid bank name provided (empty)")
	ErrInvalidBranchName      = errors.New("invalid branch name provided (empty)")
	ErrInvalidAccountType     = errors.New("invalid account type (must be 'chequeing' or 'savings')")
	ErrInvalidAccountNumber   = errors.New("invalid account number (must be 7-16 digits, numeric only)")
	ErrMissingAuthContext     = errors.New("missing authentication context")
	ErrInvalidAuthContext     = errors.New("invalid authentication context data")
	ErrNotAuthorized          = errors.New("not authorized to perform this action")
)

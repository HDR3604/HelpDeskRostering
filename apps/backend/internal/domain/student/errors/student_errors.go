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
	ErrNotFound               = errors.New("student not found")
	ErrAlreadyExists          = errors.New("student already exists")
	ErrAlreadyAccepted        = errors.New("student application already accepted")
	ErrAlreadyRejected        = errors.New("student application already rejected")
	ErrDeleted                = errors.New("student has been deleted")
	ErrAlreadyDeactivated     = errors.New("student is already deactivated")
	ErrNotDeactivated         = errors.New("student is not deactivated")
	ErrInvalidEmail           = errors.New("invalid email: must end with @my.uwi.edu")
	ErrInvalidPhone           = errors.New("invalid phone number")
	ErrInvalidStudentID       = errors.New("invalid student ID")
	ErrTranscriptMismatch     = errors.New("transcript does not belong to this student")
)

package errors

import "errors"

// Domain errors
var (
	ErrInvalidTitle           = errors.New("invalid title provided")
	ErrNotFound               = errors.New("schedule not found")
	ErrInvalidEffectivePeriod = errors.New("effective from must be before effective to and not equal")
	ErrMissingAuthContext     = errors.New("missing authentication context")
	ErrNoActiveShiftTemplates = errors.New("no active shift templates configured")
)

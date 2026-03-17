package errors

import "errors"

// Domain errors for timelog domain
var (
	ErrTimeLogNotFound    = errors.New("time log not found")
	ErrAlreadyClockedIn   = errors.New("student already has an open time log")
	ErrNotClockedIn       = errors.New("no open time log to clock out")
	ErrInvalidClockInCode = errors.New("clock-in code not found or expired")
	ErrNoActiveShift      = errors.New("student has no shift assignment right now")
	ErrInvalidCoordinates = errors.New("longitude or latitude out of range")
	ErrInvalidFlagReason  = errors.New("flag reason must not be empty")
	ErrAlreadyClockedOut  = errors.New("time log already has an exit time")
	ErrMissingAuthContext = errors.New("missing authentication context")
	ErrNotAuthorized      = errors.New("not authorized to perform this action")
)

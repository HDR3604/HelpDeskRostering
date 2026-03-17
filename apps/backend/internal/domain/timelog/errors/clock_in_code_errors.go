package errors

import "errors"

var (
	ErrInvalidClockInCode  = errors.New("clock-in code not found or expired")
	ErrNoActiveClockInCode = errors.New("no active clock-in code")
)

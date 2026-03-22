package errors

import "errors"

var (
	ErrPaymentNotFound    = errors.New("payment not found")
	ErrDuplicatePayment   = errors.New("payment already exists for this student and period")
	ErrAlreadyProcessed   = errors.New("payment has already been processed")
	ErrNotProcessed       = errors.New("payment has not been processed")
	ErrInvalidPeriod      = errors.New("invalid payment period")
	ErrMissingAuthContext = errors.New("missing authentication context")
	ErrNotAuthorized      = errors.New("not authorized to perform this action")
)

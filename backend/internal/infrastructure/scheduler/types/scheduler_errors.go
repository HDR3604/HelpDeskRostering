package scheduler

import "errors"

var (
	ErrSchedulerUnavailable  = errors.New("scheduler service is not available")
	ErrInfeasible            = errors.New("no feasible schedule found")
	ErrInvalidRequest        = errors.New("invalid schedule request")
	ErrSchedulerInternal     = errors.New("scheduler internal error")
	ErrMarshalRequest        = errors.New("failed to marshal schedule request")
	ErrUnmarshalResponse     = errors.New("failed to decode schedule response")
)

package scheduler

import "errors"

var (
	ErrSchedulerUnavailable = errors.New("scheduler service is not available")
	ErrInfeasible           = errors.New("no feasible schedule found")
)

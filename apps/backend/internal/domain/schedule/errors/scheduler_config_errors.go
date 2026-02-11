package errors

import "errors"

var (
	ErrSchedulerConfigNotFound = errors.New("scheduler config not found")
	ErrInvalidConfigName       = errors.New("invalid config name")
	ErrInvalidPenaltyWeight    = errors.New("penalty weights must be non-negative")
	ErrInvalidBaselineHours    = errors.New("baseline hours target must be at least 1")
)

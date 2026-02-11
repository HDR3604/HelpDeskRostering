package errors

import "errors"

// ScheduleGeneration domain errors
var (
	ErrGenerationNotFound  = errors.New("schedule generation not found")
	ErrGenerationNotPending = errors.New("schedule generation is not in pending status")
	ErrGenerationNotStarted = errors.New("schedule generation has not been started")
)

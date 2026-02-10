package errors

import "errors"

var (
	ErrShiftTemplateNotFound  = errors.New("shift template not found")
	ErrInvalidShiftTemplateName = errors.New("invalid shift template name")
	ErrInvalidDayOfWeek       = errors.New("day of week must be between 0 (Monday) and 6 (Sunday)")
	ErrInvalidShiftTime       = errors.New("start time must be before end time")
	ErrInvalidStaffing        = errors.New("min staff must be at least 1 and max staff must be >= min staff")
)

package aggregate

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

type TimeLog struct {
	ID             uuid.UUID
	StudentID      int32
	EntryAt        time.Time
	ExitAt         *time.Time
	Longitude      float64
	Latitude       float64
	DistanceMeters float64
	IsFlagged      bool
	FlagReason     *string
	CreatedAt      time.Time
}

func NewTimeLog(studentID int32, longitude, latitude, distanceMeters float64) (*TimeLog, error) {
	if studentID <= 0 {
		return nil, errors.ErrInvalidStudentID
	}
	if longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90 {
		return nil, errors.ErrInvalidCoordinates
	}
	if distanceMeters < 0 {
		return nil, errors.ErrInvalidCoordinates
	}

	return &TimeLog{
		ID:             uuid.New(),
		StudentID:      studentID,
		EntryAt:        time.Now().UTC(),
		Longitude:      longitude,
		Latitude:       latitude,
		DistanceMeters: distanceMeters,
	}, nil
}

func (t *TimeLog) ClockOut(now time.Time) error {
	if t.ExitAt != nil {
		return errors.ErrAlreadyClockedOut
	}
	// Ensure exit_at is never before entry_at (can happen if clocks drift
	// or with sub-microsecond timing).
	if now.Before(t.EntryAt) {
		now = t.EntryAt.Add(time.Microsecond)
	}
	t.ExitAt = &now
	return nil
}

func (t *TimeLog) Flag(reason string) error {
	if reason == "" {
		return errors.ErrInvalidFlagReason
	}
	t.IsFlagged = true
	t.FlagReason = &reason
	return nil
}

func (t *TimeLog) Unflag() {
	t.IsFlagged = false
	t.FlagReason = nil
}

func TimeLogFromModel(m model.TimeLogs) TimeLog {
	return TimeLog{
		ID:             m.ID,
		StudentID:      m.StudentID,
		EntryAt:        m.EntryAt,
		ExitAt:         m.ExitAt,
		Longitude:      m.Longitude,
		Latitude:       m.Latitude,
		DistanceMeters: m.DistanceMeters,
		IsFlagged:      m.IsFlagged,
		FlagReason:     m.FlagReason,
		CreatedAt:      m.CreatedAt,
	}
}

func (t *TimeLog) ToModel() model.TimeLogs {
	return model.TimeLogs{
		ID:             t.ID,
		StudentID:      t.StudentID,
		EntryAt:        t.EntryAt,
		ExitAt:         t.ExitAt,
		Longitude:      t.Longitude,
		Latitude:       t.Latitude,
		DistanceMeters: t.DistanceMeters,
		IsFlagged:      t.IsFlagged,
		FlagReason:     t.FlagReason,
		CreatedAt:      t.CreatedAt,
	}
}

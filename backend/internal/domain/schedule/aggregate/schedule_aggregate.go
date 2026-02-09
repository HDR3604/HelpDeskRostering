package aggregate

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

// Schedule
type Schedule struct {
	ScheduleID           uuid.UUID
	Title                string
	IsActive             bool
	Assignments          json.RawMessage
	AvailabilityMetadata json.RawMessage
	CreatedAt            time.Time
	CreatedBy            uuid.UUID
	UpdatedAt            *time.Time
	ArchivedAt           *time.Time
	EffectiveFrom        time.Time
	EffectiveTo          *time.Time
	GenerationID         *uuid.UUID
	SchedulerMetadata    *string
}

// NewSchedule creates a new schedule with validation
func NewSchedule(title string, effectiveFrom time.Time, effectiveTo *time.Time) (*Schedule, error) {
	if strings.TrimSpace(title) == "" {
		return nil, errors.ErrInvalidTitle
	}

	if effectiveTo != nil {
		if effectiveFrom.After(*effectiveTo) || effectiveFrom.Equal(*effectiveTo) {
			return nil, errors.ErrInvalidEffectivePeriod
		}
	}

	return &Schedule{
		ScheduleID:           uuid.New(),
		Title:                title,
		Assignments:          json.RawMessage("{}"),
		AvailabilityMetadata: json.RawMessage("{}"),
		EffectiveFrom:        effectiveFrom,
		EffectiveTo:          effectiveTo,
	}, nil
}

// Activate updates the schedule to be active
func (a *Schedule) Activate() {
	// Skip if already active
	if a.IsActive {
		return
	}

	a.IsActive = true
}

// Deactivate updates the schedule to be inactive
func (a *Schedule) Deactivate() {
	// Skip if already inactive
	if !a.IsActive {
		return
	}

	a.IsActive = false
}

// Archive updates the schedule to be archived
func (a *Schedule) Archive() {
	// Skip if schedule is already archived
	if a.ArchivedAt != nil {
		return
	}

	now := time.Now()
	a.IsActive = false
	a.ArchivedAt = &now
}

// Unarchive updates the schedule to be unarchived
func (a *Schedule) Unarchive() {
	// Skip if schedule is not archived already
	if a.ArchivedAt == nil {
		return
	}

	a.ArchivedAt = nil
}

// ToModel maps the Schedule aggregate to a database model
func (a *Schedule) ToModel() model.Schedules {
	return model.Schedules{
		ScheduleID:           a.ScheduleID,
		Title:                a.Title,
		IsActive:             a.IsActive,
		Assignments:          string(a.Assignments),
		AvailabilityMetadata: string(a.AvailabilityMetadata),
		CreatedAt:            a.CreatedAt,
		CreatedBy:            a.CreatedBy,
		UpdatedAt:            a.UpdatedAt,
		ArchivedAt:           a.ArchivedAt,
		EffectiveFrom:        a.EffectiveFrom,
		EffectiveTo:          a.EffectiveTo,
		GenerationID:         a.GenerationID,
		SchedulerMetadata:    a.SchedulerMetadata,
	}
}

// FromModel maps a database model to the Schedule aggregate
func ScheduleFromModel(m model.Schedules) Schedule {
	return Schedule{
		ScheduleID:           m.ScheduleID,
		Title:                m.Title,
		IsActive:             m.IsActive,
		Assignments:          json.RawMessage(m.Assignments),
		AvailabilityMetadata: json.RawMessage(m.AvailabilityMetadata),
		CreatedAt:            m.CreatedAt,
		CreatedBy:            m.CreatedBy,
		UpdatedAt:            m.UpdatedAt,
		ArchivedAt:           m.ArchivedAt,
		EffectiveFrom:        m.EffectiveFrom,
		EffectiveTo:          m.EffectiveTo,
		GenerationID:         m.GenerationID,
		SchedulerMetadata:    m.SchedulerMetadata,
	}
}

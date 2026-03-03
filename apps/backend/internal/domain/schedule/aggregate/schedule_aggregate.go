package aggregate

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

// Status represents the lifecycle state of a schedule.
type Status string

const (
	Status_Draft    Status = "draft"
	Status_Active   Status = "active"
	Status_Archived Status = "archived"
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
		Assignments:          json.RawMessage("[]"),
		AvailabilityMetadata: json.RawMessage("{}"),
		EffectiveFrom:        effectiveFrom,
		EffectiveTo:          effectiveTo,
	}, nil
}

// Status derives the lifecycle state from IsActive and ArchivedAt.
func (a *Schedule) Status() Status {
	if a.ArchivedAt != nil {
		return Status_Archived
	}
	if a.IsActive {
		return Status_Active
	}
	return Status_Draft
}

// Activate transitions the schedule from draft to active.
func (a *Schedule) Activate() error {
	switch a.Status() {
	case Status_Active:
		return errors.ErrAlreadyActive
	case Status_Archived:
		return errors.ErrInvalidTransition
	}
	a.IsActive = true
	return nil
}

// Deactivate transitions the schedule from active to draft.
func (a *Schedule) Deactivate() error {
	switch a.Status() {
	case Status_Draft:
		return errors.ErrAlreadyDraft
	case Status_Archived:
		return errors.ErrInvalidTransition
	}
	a.IsActive = false
	return nil
}

// Archive transitions the schedule from draft or active to archived.
func (a *Schedule) Archive() error {
	if a.Status() == Status_Archived {
		return errors.ErrAlreadyArchived
	}
	now := time.Now()
	a.IsActive = false
	a.ArchivedAt = &now
	return nil
}

// UpdateAssignments replaces the schedule's assignments
func (a *Schedule) UpdateAssignments(assignments json.RawMessage) {
	a.Assignments = assignments
}

// Rename updates the schedule title with validation
func (a *Schedule) Rename(title string) error {
	if strings.TrimSpace(title) == "" {
		return errors.ErrInvalidTitle
	}
	a.Title = title
	return nil
}

// Unarchive transitions the schedule from archived back to draft.
func (a *Schedule) Unarchive() error {
	switch a.Status() {
	case Status_Draft:
		return errors.ErrAlreadyDraft
	case Status_Active:
		return errors.ErrInvalidTransition
	}
	a.ArchivedAt = nil
	return nil
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

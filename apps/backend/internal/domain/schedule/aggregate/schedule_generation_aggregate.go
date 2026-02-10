package aggregate

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

type GenerationStatus string

const (
	GenerationStatus_Pending    GenerationStatus = "pending"
	GenerationStatus_Completed  GenerationStatus = "completed"
	GenerationStatus_Failed     GenerationStatus = "failed"
	GenerationStatus_Infeasible GenerationStatus = "infeasible"
)

type ScheduleGeneration struct {
	ID              uuid.UUID
	ScheduleID      *uuid.UUID
	ConfigID        uuid.UUID
	Status          GenerationStatus
	RequestPayload  *string
	ResponsePayload *string
	ErrorMessage    *string
	StartedAt       *time.Time
	CompletedAt     *time.Time
	CreatedAt       time.Time
	CreatedBy       uuid.UUID
}

// NewScheduleGeneration creates a new generation record in pending status.
func NewScheduleGeneration(configID uuid.UUID, createdBy uuid.UUID, requestPayload string) *ScheduleGeneration {
	return &ScheduleGeneration{
		ID:             uuid.New(),
		ConfigID:       configID,
		Status:         GenerationStatus_Pending,
		RequestPayload: &requestPayload,
		CreatedBy:      createdBy,
	}
}

// MarkStarted sets the started_at timestamp. Only valid when status is pending.
func (g *ScheduleGeneration) MarkStarted() error {
	if g.Status != GenerationStatus_Pending {
		return errors.ErrGenerationNotPending
	}
	now := time.Now()
	g.StartedAt = &now
	return nil
}

// MarkCompleted transitions to completed status with the resulting schedule and response payload.
func (g *ScheduleGeneration) MarkCompleted(scheduleID uuid.UUID, responsePayload string) error {
	if g.StartedAt == nil {
		return errors.ErrGenerationNotStarted
	}
	g.Status = GenerationStatus_Completed
	g.ScheduleID = &scheduleID
	g.ResponsePayload = &responsePayload
	now := time.Now()
	g.CompletedAt = &now
	return nil
}

// MarkFailed transitions to failed status with an error message.
func (g *ScheduleGeneration) MarkFailed(errorMessage string) error {
	if g.StartedAt == nil {
		return errors.ErrGenerationNotStarted
	}
	g.Status = GenerationStatus_Failed
	g.ErrorMessage = &errorMessage
	now := time.Now()
	g.CompletedAt = &now
	return nil
}

// MarkInfeasible transitions to infeasible status with response payload and error message.
func (g *ScheduleGeneration) MarkInfeasible(responsePayload string, errorMessage string) error {
	if g.StartedAt == nil {
		return errors.ErrGenerationNotStarted
	}
	g.Status = GenerationStatus_Infeasible
	g.ResponsePayload = &responsePayload
	g.ErrorMessage = &errorMessage
	now := time.Now()
	g.CompletedAt = &now
	return nil
}

func (g *ScheduleGeneration) ToModel() model.ScheduleGenerations {
	return model.ScheduleGenerations{
		ID:              g.ID,
		ScheduleID:      g.ScheduleID,
		ConfigID:        g.ConfigID,
		Status:          string(g.Status),
		RequestPayload:  g.RequestPayload,
		ResponsePayload: g.ResponsePayload,
		ErrorMessage:    g.ErrorMessage,
		StartedAt:       g.StartedAt,
		CompletedAt:     g.CompletedAt,
		CreatedAt:       g.CreatedAt,
		CreatedBy:       g.CreatedBy,
	}
}

func ScheduleGenerationFromModel(m model.ScheduleGenerations) ScheduleGeneration {
	return ScheduleGeneration{
		ID:              m.ID,
		ScheduleID:      m.ScheduleID,
		ConfigID:        m.ConfigID,
		Status:          GenerationStatus(m.Status),
		RequestPayload:  m.RequestPayload,
		ResponsePayload: m.ResponsePayload,
		ErrorMessage:    m.ErrorMessage,
		StartedAt:       m.StartedAt,
		CompletedAt:     m.CompletedAt,
		CreatedAt:       m.CreatedAt,
		CreatedBy:       m.CreatedBy,
	}
}

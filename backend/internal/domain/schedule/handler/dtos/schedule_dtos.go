package dtos

import (
	"encoding/json"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
)

type CreateScheduleRequest struct {
	Title         string  `json:"title"`
	EffectiveFrom string  `json:"effective_from"` // format: "2006-01-02"
	EffectiveTo   *string `json:"effective_to"`   // format: "2006-01-02"
}

type GenerateScheduleRequest struct {
	ConfigID      string                        `json:"config_id"`
	Title         string                        `json:"title"`
	EffectiveFrom string                        `json:"effective_from"` // format: "2006-01-02"
	EffectiveTo   *string                       `json:"effective_to"`   // format: "2006-01-02"
	Request       types.GenerateScheduleRequest `json:"request"`
}

type ScheduleResponse struct {
	ScheduleID           string          `json:"schedule_id"`
	Title                string          `json:"title"`
	IsActive             bool            `json:"is_active"`
	Assignments          json.RawMessage `json:"assignments"`
	AvailabilityMetadata json.RawMessage `json:"availability_metadata"`
	CreatedAt            time.Time       `json:"created_at"`
	CreatedBy            string          `json:"created_by"`
	UpdatedAt            *time.Time      `json:"updated_at"`
	ArchivedAt           *time.Time      `json:"archived_at"`
	EffectiveFrom        string          `json:"effective_from"`
	EffectiveTo          *string         `json:"effective_to,omitempty"`
	GenerationID         *string         `json:"generation_id,omitempty"`
	SchedulerMetadata    json.RawMessage `json:"scheduler_metadata,omitempty"`
}

func ScheduleToResponse(s *aggregate.Schedule) ScheduleResponse {
	resp := ScheduleResponse{
		ScheduleID:           s.ScheduleID.String(),
		Title:                s.Title,
		IsActive:             s.IsActive,
		Assignments:          s.Assignments,
		AvailabilityMetadata: s.AvailabilityMetadata,
		CreatedAt:            s.CreatedAt,
		CreatedBy:            s.CreatedBy.String(),
		UpdatedAt:            s.UpdatedAt,
		ArchivedAt:           s.ArchivedAt,
		EffectiveFrom:        s.EffectiveFrom.Format("2006-01-02"),
	}

	if s.EffectiveTo != nil {
		formatted := s.EffectiveTo.Format("2006-01-02")
		resp.EffectiveTo = &formatted
	}

	if s.GenerationID != nil {
		gid := s.GenerationID.String()
		resp.GenerationID = &gid
	}

	if s.SchedulerMetadata != nil {
		resp.SchedulerMetadata = json.RawMessage(*s.SchedulerMetadata)
	}

	return resp
}

func SchedulesToResponse(schedules []*aggregate.Schedule) []ScheduleResponse {
	responses := make([]ScheduleResponse, len(schedules))
	for i, s := range schedules {
		responses[i] = ScheduleToResponse(s)
	}
	return responses
}

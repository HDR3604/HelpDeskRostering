package handler

import (
	"encoding/json"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
)

type CreateScheduleRequest struct {
	Title         string  `json:"title"`
	EffectiveFrom string  `json:"effective_from"` // format: "2006-01-02"
	EffectiveTo   *string `json:"effective_to"`   // format: "2006-01-02"
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
}

func scheduleToResponse(s *aggregate.Schedule) ScheduleResponse {
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

	return resp
}

func schedulesToResponse(schedules []*aggregate.Schedule) []ScheduleResponse {
	responses := make([]ScheduleResponse, len(schedules))
	for i, s := range schedules {
		responses[i] = scheduleToResponse(s)
	}
	return responses
}

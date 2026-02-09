package dtos

import (
	"encoding/json"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
)

type ScheduleGenerationResponse struct {
	ID              string          `json:"id"`
	ScheduleID      *string         `json:"schedule_id,omitempty"`
	ConfigID        string          `json:"config_id"`
	Status          string          `json:"status"`
	RequestPayload  json.RawMessage `json:"request_payload,omitempty"`
	ResponsePayload json.RawMessage `json:"response_payload,omitempty"`
	ErrorMessage    *string         `json:"error_message,omitempty"`
	StartedAt       *time.Time      `json:"started_at,omitempty"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	CreatedBy       string          `json:"created_by"`
}

func ScheduleGenerationToResponse(g *aggregate.ScheduleGeneration) ScheduleGenerationResponse {
	resp := ScheduleGenerationResponse{
		ID:           g.ID.String(),
		ConfigID:     g.ConfigID.String(),
		Status:       string(g.Status),
		ErrorMessage: g.ErrorMessage,
		StartedAt:    g.StartedAt,
		CompletedAt:  g.CompletedAt,
		CreatedAt:    g.CreatedAt,
		CreatedBy:    g.CreatedBy.String(),
	}

	if g.ScheduleID != nil {
		sid := g.ScheduleID.String()
		resp.ScheduleID = &sid
	}

	if g.RequestPayload != nil {
		resp.RequestPayload = json.RawMessage(*g.RequestPayload)
	}

	if g.ResponsePayload != nil {
		resp.ResponsePayload = json.RawMessage(*g.ResponsePayload)
	}

	return resp
}

func ScheduleGenerationsToResponse(generations []*aggregate.ScheduleGeneration) []ScheduleGenerationResponse {
	responses := make([]ScheduleGenerationResponse, len(generations))
	for i, g := range generations {
		responses[i] = ScheduleGenerationToResponse(g)
	}
	return responses
}

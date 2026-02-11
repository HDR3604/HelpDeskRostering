package dtos

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
)

type CreateSchedulerConfigRequest struct {
	Name                  string   `json:"name"`
	CourseShortfallPenalty float64  `json:"course_shortfall_penalty"`
	MinHoursPenalty       float64  `json:"min_hours_penalty"`
	MaxHoursPenalty       float64  `json:"max_hours_penalty"`
	UnderstaffedPenalty   float64  `json:"understaffed_penalty"`
	ExtraHoursPenalty     float64  `json:"extra_hours_penalty"`
	MaxExtraPenalty       float64  `json:"max_extra_penalty"`
	BaselineHoursTarget   int32    `json:"baseline_hours_target"`
	SolverTimeLimit       *int32   `json:"solver_time_limit,omitempty"`
	SolverGap             *float64 `json:"solver_gap,omitempty"`
	LogSolverOutput       bool     `json:"log_solver_output"`
}

type UpdateSchedulerConfigRequest struct {
	Name                  string   `json:"name"`
	CourseShortfallPenalty float64  `json:"course_shortfall_penalty"`
	MinHoursPenalty       float64  `json:"min_hours_penalty"`
	MaxHoursPenalty       float64  `json:"max_hours_penalty"`
	UnderstaffedPenalty   float64  `json:"understaffed_penalty"`
	ExtraHoursPenalty     float64  `json:"extra_hours_penalty"`
	MaxExtraPenalty       float64  `json:"max_extra_penalty"`
	BaselineHoursTarget   int32    `json:"baseline_hours_target"`
	SolverTimeLimit       *int32   `json:"solver_time_limit,omitempty"`
	SolverGap             *float64 `json:"solver_gap,omitempty"`
	LogSolverOutput       bool     `json:"log_solver_output"`
}

type SchedulerConfigResponse struct {
	ID                    string     `json:"id"`
	Name                  string     `json:"name"`
	CourseShortfallPenalty float64   `json:"course_shortfall_penalty"`
	MinHoursPenalty       float64    `json:"min_hours_penalty"`
	MaxHoursPenalty       float64    `json:"max_hours_penalty"`
	UnderstaffedPenalty   float64    `json:"understaffed_penalty"`
	ExtraHoursPenalty     float64    `json:"extra_hours_penalty"`
	MaxExtraPenalty       float64    `json:"max_extra_penalty"`
	BaselineHoursTarget   int32      `json:"baseline_hours_target"`
	SolverTimeLimit       *int32     `json:"solver_time_limit,omitempty"`
	SolverGap             *float64   `json:"solver_gap,omitempty"`
	LogSolverOutput       bool       `json:"log_solver_output"`
	IsDefault             bool       `json:"is_default"`
	CreatedAt             time.Time  `json:"created_at"`
	UpdatedAt             *time.Time `json:"updated_at,omitempty"`
}

func SchedulerConfigToResponse(c *aggregate.SchedulerConfig) SchedulerConfigResponse {
	return SchedulerConfigResponse{
		ID:                    c.ID.String(),
		Name:                  c.Name,
		CourseShortfallPenalty: c.CourseShortfallPenalty,
		MinHoursPenalty:       c.MinHoursPenalty,
		MaxHoursPenalty:       c.MaxHoursPenalty,
		UnderstaffedPenalty:   c.UnderstaffedPenalty,
		ExtraHoursPenalty:     c.ExtraHoursPenalty,
		MaxExtraPenalty:       c.MaxExtraPenalty,
		BaselineHoursTarget:   c.BaselineHoursTarget,
		SolverTimeLimit:       c.SolverTimeLimit,
		SolverGap:             c.SolverGap,
		LogSolverOutput:       c.LogSolverOutput,
		IsDefault:             c.IsDefault,
		CreatedAt:             c.CreatedAt,
		UpdatedAt:             c.UpdatedAt,
	}
}

func SchedulerConfigsToResponse(configs []*aggregate.SchedulerConfig) []SchedulerConfigResponse {
	responses := make([]SchedulerConfigResponse, len(configs))
	for i, c := range configs {
		responses[i] = SchedulerConfigToResponse(c)
	}
	return responses
}

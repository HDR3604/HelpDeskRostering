package aggregate

import (
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

type SchedulerConfig struct {
	ID                    uuid.UUID
	Name                  string
	CourseShortfallPenalty float64
	MinHoursPenalty       float64
	MaxHoursPenalty       float64
	UnderstaffedPenalty   float64
	ExtraHoursPenalty     float64
	MaxExtraPenalty       float64
	BaselineHoursTarget   int32
	SolverTimeLimit       *int32
	SolverGap             *float64
	LogSolverOutput       bool
	IsDefault             bool
	CreatedAt             time.Time
	UpdatedAt             *time.Time
}

func NewSchedulerConfig(
	name string,
	courseShortfallPenalty, minHoursPenalty, maxHoursPenalty float64,
	understaffedPenalty, extraHoursPenalty, maxExtraPenalty float64,
	baselineHoursTarget int32,
	solverTimeLimit *int32,
	solverGap *float64,
	logSolverOutput bool,
) (*SchedulerConfig, error) {
	if err := validateSchedulerConfig(
		name,
		courseShortfallPenalty, minHoursPenalty, maxHoursPenalty,
		understaffedPenalty, extraHoursPenalty, maxExtraPenalty,
		baselineHoursTarget,
	); err != nil {
		return nil, err
	}

	return &SchedulerConfig{
		ID:                    uuid.New(),
		Name:                  name,
		CourseShortfallPenalty: courseShortfallPenalty,
		MinHoursPenalty:       minHoursPenalty,
		MaxHoursPenalty:       maxHoursPenalty,
		UnderstaffedPenalty:   understaffedPenalty,
		ExtraHoursPenalty:     extraHoursPenalty,
		MaxExtraPenalty:       maxExtraPenalty,
		BaselineHoursTarget:   baselineHoursTarget,
		SolverTimeLimit:       solverTimeLimit,
		SolverGap:             solverGap,
		LogSolverOutput:       logSolverOutput,
	}, nil
}

func (c *SchedulerConfig) Update(
	name string,
	courseShortfallPenalty, minHoursPenalty, maxHoursPenalty float64,
	understaffedPenalty, extraHoursPenalty, maxExtraPenalty float64,
	baselineHoursTarget int32,
	solverTimeLimit *int32,
	solverGap *float64,
	logSolverOutput bool,
) error {
	if err := validateSchedulerConfig(
		name,
		courseShortfallPenalty, minHoursPenalty, maxHoursPenalty,
		understaffedPenalty, extraHoursPenalty, maxExtraPenalty,
		baselineHoursTarget,
	); err != nil {
		return err
	}

	c.Name = name
	c.CourseShortfallPenalty = courseShortfallPenalty
	c.MinHoursPenalty = minHoursPenalty
	c.MaxHoursPenalty = maxHoursPenalty
	c.UnderstaffedPenalty = understaffedPenalty
	c.ExtraHoursPenalty = extraHoursPenalty
	c.MaxExtraPenalty = maxExtraPenalty
	c.BaselineHoursTarget = baselineHoursTarget
	c.SolverTimeLimit = solverTimeLimit
	c.SolverGap = solverGap
	c.LogSolverOutput = logSolverOutput
	return nil
}

func validateSchedulerConfig(
	name string,
	courseShortfallPenalty, minHoursPenalty, maxHoursPenalty float64,
	understaffedPenalty, extraHoursPenalty, maxExtraPenalty float64,
	baselineHoursTarget int32,
) error {
	if strings.TrimSpace(name) == "" {
		return errors.ErrInvalidConfigName
	}
	if courseShortfallPenalty < 0 || minHoursPenalty < 0 || maxHoursPenalty < 0 ||
		understaffedPenalty < 0 || extraHoursPenalty < 0 || maxExtraPenalty < 0 {
		return errors.ErrInvalidPenaltyWeight
	}
	if baselineHoursTarget < 1 {
		return errors.ErrInvalidBaselineHours
	}
	return nil
}

func (c *SchedulerConfig) ToModel() model.SchedulerConfigs {
	return model.SchedulerConfigs{
		ID:                    c.ID,
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

func SchedulerConfigFromModel(m model.SchedulerConfigs) SchedulerConfig {
	return SchedulerConfig{
		ID:                    m.ID,
		Name:                  m.Name,
		CourseShortfallPenalty: m.CourseShortfallPenalty,
		MinHoursPenalty:       m.MinHoursPenalty,
		MaxHoursPenalty:       m.MaxHoursPenalty,
		UnderstaffedPenalty:   m.UnderstaffedPenalty,
		ExtraHoursPenalty:     m.ExtraHoursPenalty,
		MaxExtraPenalty:       m.MaxExtraPenalty,
		BaselineHoursTarget:   m.BaselineHoursTarget,
		SolverTimeLimit:       m.SolverTimeLimit,
		SolverGap:             m.SolverGap,
		LogSolverOutput:       m.LogSolverOutput,
		IsDefault:             m.IsDefault,
		CreatedAt:             m.CreatedAt,
		UpdatedAt:             m.UpdatedAt,
	}
}

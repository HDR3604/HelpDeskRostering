package dtos

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
)

type CourseDemandDTO struct {
	CourseCode     string  `json:"course_code"`
	TutorsRequired int     `json:"tutors_required"`
	Weight         float64 `json:"weight"`
}

type CreateShiftTemplateRequest struct {
	Name          string            `json:"name"`
	DayOfWeek     int32             `json:"day_of_week"`
	StartTime     string            `json:"start_time"`  // "HH:MM"
	EndTime       string            `json:"end_time"`    // "HH:MM"
	MinStaff      int32             `json:"min_staff"`
	MaxStaff      *int32            `json:"max_staff,omitempty"`
	CourseDemands []CourseDemandDTO `json:"course_demands"`
}

type UpdateShiftTemplateRequest struct {
	Name          string            `json:"name"`
	DayOfWeek     int32             `json:"day_of_week"`
	StartTime     string            `json:"start_time"`  // "HH:MM"
	EndTime       string            `json:"end_time"`    // "HH:MM"
	MinStaff      int32             `json:"min_staff"`
	MaxStaff      *int32            `json:"max_staff,omitempty"`
	CourseDemands []CourseDemandDTO `json:"course_demands"`
}

type ShiftTemplateResponse struct {
	ID            string            `json:"id"`
	Name          string            `json:"name"`
	DayOfWeek     int32             `json:"day_of_week"`
	StartTime     string            `json:"start_time"`
	EndTime       string            `json:"end_time"`
	MinStaff      int32             `json:"min_staff"`
	MaxStaff      *int32            `json:"max_staff,omitempty"`
	CourseDemands []CourseDemandDTO `json:"course_demands"`
	IsActive      bool              `json:"is_active"`
	CreatedAt     time.Time         `json:"created_at"`
	UpdatedAt     *time.Time        `json:"updated_at,omitempty"`
}

func ShiftTemplateToResponse(t *aggregate.ShiftTemplate) ShiftTemplateResponse {
	demands := make([]CourseDemandDTO, len(t.CourseDemands))
	for i, d := range t.CourseDemands {
		demands[i] = CourseDemandDTO{
			CourseCode:     d.CourseCode,
			TutorsRequired: d.TutorsRequired,
			Weight:         d.Weight,
		}
	}

	return ShiftTemplateResponse{
		ID:            t.ID.String(),
		Name:          t.Name,
		DayOfWeek:     t.DayOfWeek,
		StartTime:     t.StartTime.Format("15:04"),
		EndTime:       t.EndTime.Format("15:04"),
		MinStaff:      t.MinStaff,
		MaxStaff:      t.MaxStaff,
		CourseDemands: demands,
		IsActive:      t.IsActive,
		CreatedAt:     t.CreatedAt,
		UpdatedAt:     t.UpdatedAt,
	}
}

func ShiftTemplatesToResponse(templates []*aggregate.ShiftTemplate) []ShiftTemplateResponse {
	responses := make([]ShiftTemplateResponse, len(templates))
	for i, t := range templates {
		responses[i] = ShiftTemplateToResponse(t)
	}
	return responses
}

func CourseDemandDTOsToAggregate(dtos []CourseDemandDTO) []aggregate.CourseDemand {
	if dtos == nil {
		return []aggregate.CourseDemand{}
	}
	demands := make([]aggregate.CourseDemand, len(dtos))
	for i, d := range dtos {
		demands[i] = aggregate.CourseDemand{
			CourseCode:     d.CourseCode,
			TutorsRequired: d.TutorsRequired,
			Weight:         d.Weight,
		}
	}
	return demands
}

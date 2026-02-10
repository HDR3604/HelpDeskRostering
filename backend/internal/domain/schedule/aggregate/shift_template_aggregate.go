package aggregate

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

type CourseDemand struct {
	CourseCode     string  `json:"course_code"`
	TutorsRequired int     `json:"tutors_required"`
	Weight         float64 `json:"weight"`
}

type ShiftTemplate struct {
	ID            uuid.UUID
	Name          string
	DayOfWeek     int32
	StartTime     time.Time
	EndTime       time.Time
	MinStaff      int32
	MaxStaff      *int32
	CourseDemands []CourseDemand
	IsActive      bool
	CreatedAt     time.Time
	UpdatedAt     *time.Time
}

func NewShiftTemplate(name string, dayOfWeek int32, startTime, endTime time.Time, minStaff int32, maxStaff *int32, courseDemands []CourseDemand) (*ShiftTemplate, error) {
	if err := validateShiftTemplate(name, dayOfWeek, startTime, endTime, minStaff, maxStaff); err != nil {
		return nil, err
	}

	if courseDemands == nil {
		courseDemands = []CourseDemand{}
	}

	return &ShiftTemplate{
		ID:            uuid.New(),
		Name:          name,
		DayOfWeek:     dayOfWeek,
		StartTime:     startTime,
		EndTime:       endTime,
		MinStaff:      minStaff,
		MaxStaff:      maxStaff,
		CourseDemands: courseDemands,
		IsActive:      true,
	}, nil
}

func (s *ShiftTemplate) Update(name string, dayOfWeek int32, startTime, endTime time.Time, minStaff int32, maxStaff *int32, courseDemands []CourseDemand) error {
	if err := validateShiftTemplate(name, dayOfWeek, startTime, endTime, minStaff, maxStaff); err != nil {
		return err
	}

	if courseDemands == nil {
		courseDemands = []CourseDemand{}
	}

	s.Name = name
	s.DayOfWeek = dayOfWeek
	s.StartTime = startTime
	s.EndTime = endTime
	s.MinStaff = minStaff
	s.MaxStaff = maxStaff
	s.CourseDemands = courseDemands
	return nil
}

func (s *ShiftTemplate) Activate() {
	if s.IsActive {
		return
	}
	s.IsActive = true
}

func (s *ShiftTemplate) Deactivate() {
	if !s.IsActive {
		return
	}
	s.IsActive = false
}

func validateShiftTemplate(name string, dayOfWeek int32, startTime, endTime time.Time, minStaff int32, maxStaff *int32) error {
	if strings.TrimSpace(name) == "" {
		return errors.ErrInvalidShiftTemplateName
	}
	if dayOfWeek < 0 || dayOfWeek > 6 {
		return errors.ErrInvalidDayOfWeek
	}
	if !startTime.Before(endTime) {
		return errors.ErrInvalidShiftTime
	}
	if minStaff < 1 {
		return errors.ErrInvalidStaffing
	}
	if maxStaff != nil && *maxStaff < minStaff {
		return errors.ErrInvalidStaffing
	}
	return nil
}

func (s *ShiftTemplate) ToModel() model.ShiftTemplates {
	demandsJSON, _ := json.Marshal(s.CourseDemands)

	return model.ShiftTemplates{
		ID:            s.ID,
		Name:          s.Name,
		DayOfWeek:     s.DayOfWeek,
		StartTime:     s.StartTime,
		EndTime:       s.EndTime,
		MinStaff:      s.MinStaff,
		MaxStaff:      s.MaxStaff,
		CourseDemands: string(demandsJSON),
		IsActive:      s.IsActive,
		CreatedAt:     s.CreatedAt,
		UpdatedAt:     s.UpdatedAt,
	}
}

func ShiftTemplateFromModel(m model.ShiftTemplates) ShiftTemplate {
	var demands []CourseDemand
	if err := json.Unmarshal([]byte(m.CourseDemands), &demands); err != nil {
		demands = []CourseDemand{}
	}

	return ShiftTemplate{
		ID:            m.ID,
		Name:          m.Name,
		DayOfWeek:     m.DayOfWeek,
		StartTime:     m.StartTime,
		EndTime:       m.EndTime,
		MinStaff:      m.MinStaff,
		MaxStaff:      m.MaxStaff,
		CourseDemands: demands,
		IsActive:      m.IsActive,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}

package scheduler

import "time"

type Assistant struct {
	ID          string   `json:"id"`
	Courses     []string `json:"courses"`
	MinHours    float32  `json:"min_hours"`
	MaxHours    float32  `json:"max_hours"`
	CostPerHour float32  `json:"cost_per_hour"`
}

type CourseDemand struct {
	CourseCode     string  `json:"course_code"`
	TutorsRequired int     `json:"tutors_required"`
	Weight         float32 `json:"weight"`
}

type Shift struct {
	ID            string            `json:"id"`
	DayOfWeek     int               `json:"day_of_week"`
	Start         time.Time         `json:"start"`
	End           time.Time         `json:"end"`
	CourseDemands []CourseDemand    `json:"course_demands"`
	MinStaff      int               `json:"min_staff"`
	MaxStaff      *int              `json:"max_staff,omitempty"`
	Metadata      map[string]string `json:"metadata"`
}

type SchedulerConfig struct {
	CourseShortfallPenalty float32  `json:"course_shortfall_penalty"`
	MinHoursPenalty        float32  `json:"min_hours_penalty"`
	MaxHoursPenalty        float32  `json:"max_hours_penalty"`
	UnderstaffedPenalty    float32  `json:"understaffed_penalty"`
	ExtraHoursPenalty      float32  `json:"extra_hours_penalty"`
	MaxExtraPenalty        float32  `json:"max_extra_penalty"`
	BaselineHoursTarget    int32    `json:"baseline_hours_target"`
	AllowMinimumViolation  bool     `json:"allow_minimum_violation"`
	StaffShortfallMax      *int32   `json:"staff_shortfall_max,omitempty"`
	SolverTimeLimit        *int32   `json:"solver_time_limit,omitempty"`
	SolverGap              *float32 `json:"solver_gap,omitempty"`
	LogSolverOutput        bool     `json:"log_solver_output"`
}

type Assignment struct {
	AssistantID string    `json:"assistant_id"`
	ShiftID     string    `json:"shift_id"`
	DayOfWeek   int       `json:"day_of_week"`
	Start       time.Time `json:"start"`
	End         time.Time `json:"end"`
}

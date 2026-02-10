package types

// TODO: Move these types to a more appropriate location, such as a shared "dtos" package, if they are used across multiple services.

type ScheduleStatus string

const (
	ScheduleStatus_Optimal    ScheduleStatus = "Optimal"
	ScheduleStatus_Feasible   ScheduleStatus = "Feasible"
	ScheduleStatus_Infeasible ScheduleStatus = "Infeasible"
)

type GenerateScheduleRequest struct {
	Assistants      []Assistant      `json:"assistants"`
	Shifts          []Shift          `json:"shifts"`
	SchedulerConfig *SchedulerConfig `json:"scheduler_config,omitempty"`
}

type GenerateScheduleMetadata struct {
	ObjectiveValue   *float32           `json:"objective_value,omitempty"`
	SolverStatusCode int                `json:"solver_status_code"`
	CourseShortfalls map[string]float32 `json:"course_shortfalls"`
	StaffShortfalls  map[string]float32 `json:"staff_shortfalls"`
}

type GenerateScheduleResponse struct {
	Status         ScheduleStatus           `json:"status"`
	Assignments    []Assignment             `json:"assignments"`
	AssistantHours map[string]float32       `json:"assistant_hours"`
	Metadata       GenerateScheduleMetadata `json:"metadata"`
}

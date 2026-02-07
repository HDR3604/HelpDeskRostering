package interfaces

import (
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
)

type SchedulerServiceInterface interface {
	GenerateSchedule(req types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error)
}

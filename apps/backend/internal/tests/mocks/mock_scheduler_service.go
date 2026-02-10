package mocks

import (
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
)

var _ interfaces.SchedulerServiceInterface = (*MockSchedulerService)(nil)

type MockSchedulerService struct {
	GenerateScheduleFn func(req types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error)
}

func (m *MockSchedulerService) GenerateSchedule(req types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
	return m.GenerateScheduleFn(req)
}

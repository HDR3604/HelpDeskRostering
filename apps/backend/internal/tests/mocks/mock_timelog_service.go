package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
)

var _ service.TimeLogServiceInterface = (*MockTimeLogService)(nil)

// MockTimeLogService provides function-based mocking for the time log service.
// Set the Fn fields to control return values per test case.
type MockTimeLogService struct {
	ClockInFn              func(ctx context.Context, input service.ClockInInput) (*aggregate.TimeLog, error)
	ClockOutFn             func(ctx context.Context) (*aggregate.TimeLog, error)
	GetMyStatusFn          func(ctx context.Context) (*service.ClockInStatus, error)
	ListMyTimeLogsFn       func(ctx context.Context, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error)
	GenerateClockInCodeFn  func(ctx context.Context, expiresInMinutes int) (*aggregate.ClockInCode, error)
	GetActiveClockInCodeFn func(ctx context.Context) (*aggregate.ClockInCode, error)
}

func (m *MockTimeLogService) ClockIn(ctx context.Context, input service.ClockInInput) (*aggregate.TimeLog, error) {
	return m.ClockInFn(ctx, input)
}

func (m *MockTimeLogService) ClockOut(ctx context.Context) (*aggregate.TimeLog, error) {
	return m.ClockOutFn(ctx)
}

func (m *MockTimeLogService) GetMyStatus(ctx context.Context) (*service.ClockInStatus, error) {
	return m.GetMyStatusFn(ctx)
}

func (m *MockTimeLogService) ListMyTimeLogs(ctx context.Context, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error) {
	return m.ListMyTimeLogsFn(ctx, filter)
}

func (m *MockTimeLogService) GenerateClockInCode(ctx context.Context, expiresInMinutes int) (*aggregate.ClockInCode, error) {
	return m.GenerateClockInCodeFn(ctx, expiresInMinutes)
}

func (m *MockTimeLogService) GetActiveClockInCode(ctx context.Context) (*aggregate.ClockInCode, error) {
	return m.GetActiveClockInCodeFn(ctx)
}

package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
)

var _ service.ScheduleJobEnqueuer = (*MockJobEnqueuer)(nil)

type MockJobEnqueuer struct {
	EnqueueScheduleGenerationFn func(ctx context.Context, args service.ScheduleGenerationJobArgs) error
}

func (m *MockJobEnqueuer) EnqueueScheduleGeneration(ctx context.Context, args service.ScheduleGenerationJobArgs) error {
	return m.EnqueueScheduleGenerationFn(ctx, args)
}

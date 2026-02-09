package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/google/uuid"
)

var _ service.ScheduleGenerationServiceInterface = (*MockScheduleGenerationService)(nil)

type MockScheduleGenerationService struct {
	CreateFn         func(ctx context.Context, configID uuid.UUID, createdBy uuid.UUID, requestPayload string) (*aggregate.ScheduleGeneration, error)
	MarkStartedFn    func(ctx context.Context, id uuid.UUID) error
	MarkCompletedFn  func(ctx context.Context, id uuid.UUID, scheduleID uuid.UUID, responsePayload string) error
	MarkFailedFn     func(ctx context.Context, id uuid.UUID, errorMessage string) error
	MarkInfeasibleFn func(ctx context.Context, id uuid.UUID, responsePayload string, errorMessage string) error
	GetByIDFn        func(ctx context.Context, id uuid.UUID) (*aggregate.ScheduleGeneration, error)
	ListFn           func(ctx context.Context) ([]*aggregate.ScheduleGeneration, error)
}

func (m *MockScheduleGenerationService) Create(ctx context.Context, configID uuid.UUID, createdBy uuid.UUID, requestPayload string) (*aggregate.ScheduleGeneration, error) {
	return m.CreateFn(ctx, configID, createdBy, requestPayload)
}

func (m *MockScheduleGenerationService) MarkStarted(ctx context.Context, id uuid.UUID) error {
	return m.MarkStartedFn(ctx, id)
}

func (m *MockScheduleGenerationService) MarkCompleted(ctx context.Context, id uuid.UUID, scheduleID uuid.UUID, responsePayload string) error {
	return m.MarkCompletedFn(ctx, id, scheduleID, responsePayload)
}

func (m *MockScheduleGenerationService) MarkFailed(ctx context.Context, id uuid.UUID, errorMessage string) error {
	return m.MarkFailedFn(ctx, id, errorMessage)
}

func (m *MockScheduleGenerationService) MarkInfeasible(ctx context.Context, id uuid.UUID, responsePayload string, errorMessage string) error {
	return m.MarkInfeasibleFn(ctx, id, responsePayload, errorMessage)
}

func (m *MockScheduleGenerationService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *MockScheduleGenerationService) List(ctx context.Context) ([]*aggregate.ScheduleGeneration, error) {
	return m.ListFn(ctx)
}

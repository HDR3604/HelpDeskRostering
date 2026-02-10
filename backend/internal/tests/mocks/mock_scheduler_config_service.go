package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/google/uuid"
)

var _ service.SchedulerConfigServiceInterface = (*MockSchedulerConfigService)(nil)

type MockSchedulerConfigService struct {
	CreateFn     func(ctx context.Context, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error)
	GetByIDFn    func(ctx context.Context, id uuid.UUID) (*aggregate.SchedulerConfig, error)
	GetDefaultFn func(ctx context.Context) (*aggregate.SchedulerConfig, error)
	ListFn       func(ctx context.Context) ([]*aggregate.SchedulerConfig, error)
	UpdateFn     func(ctx context.Context, id uuid.UUID, params service.UpdateSchedulerConfigParams) (*aggregate.SchedulerConfig, error)
	SetDefaultFn func(ctx context.Context, id uuid.UUID) error
}

func (m *MockSchedulerConfigService) Create(ctx context.Context, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
	return m.CreateFn(ctx, c)
}

func (m *MockSchedulerConfigService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *MockSchedulerConfigService) GetDefault(ctx context.Context) (*aggregate.SchedulerConfig, error) {
	return m.GetDefaultFn(ctx)
}

func (m *MockSchedulerConfigService) List(ctx context.Context) ([]*aggregate.SchedulerConfig, error) {
	return m.ListFn(ctx)
}

func (m *MockSchedulerConfigService) Update(ctx context.Context, id uuid.UUID, params service.UpdateSchedulerConfigParams) (*aggregate.SchedulerConfig, error) {
	return m.UpdateFn(ctx, id, params)
}

func (m *MockSchedulerConfigService) SetDefault(ctx context.Context, id uuid.UUID) error {
	return m.SetDefaultFn(ctx, id)
}

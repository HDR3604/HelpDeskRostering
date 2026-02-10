package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/google/uuid"
)

var _ service.ShiftTemplateServiceInterface = (*MockShiftTemplateService)(nil)

type MockShiftTemplateService struct {
	CreateFn     func(ctx context.Context, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error)
	BulkCreateFn func(ctx context.Context, templates []*aggregate.ShiftTemplate) ([]*aggregate.ShiftTemplate, error)
	GetByIDFn    func(ctx context.Context, id uuid.UUID) (*aggregate.ShiftTemplate, error)
	ListFn       func(ctx context.Context) ([]*aggregate.ShiftTemplate, error)
	ListAllFn    func(ctx context.Context) ([]*aggregate.ShiftTemplate, error)
	UpdateFn     func(ctx context.Context, id uuid.UUID, params service.UpdateShiftTemplateParams) (*aggregate.ShiftTemplate, error)
	ActivateFn   func(ctx context.Context, id uuid.UUID) error
	DeactivateFn func(ctx context.Context, id uuid.UUID) error
}

func (m *MockShiftTemplateService) Create(ctx context.Context, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
	return m.CreateFn(ctx, t)
}

func (m *MockShiftTemplateService) BulkCreate(ctx context.Context, templates []*aggregate.ShiftTemplate) ([]*aggregate.ShiftTemplate, error) {
	return m.BulkCreateFn(ctx, templates)
}

func (m *MockShiftTemplateService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *MockShiftTemplateService) List(ctx context.Context) ([]*aggregate.ShiftTemplate, error) {
	return m.ListFn(ctx)
}

func (m *MockShiftTemplateService) ListAll(ctx context.Context) ([]*aggregate.ShiftTemplate, error) {
	return m.ListAllFn(ctx)
}

func (m *MockShiftTemplateService) Update(ctx context.Context, id uuid.UUID, params service.UpdateShiftTemplateParams) (*aggregate.ShiftTemplate, error) {
	return m.UpdateFn(ctx, id, params)
}

func (m *MockShiftTemplateService) Activate(ctx context.Context, id uuid.UUID) error {
	return m.ActivateFn(ctx, id)
}

func (m *MockShiftTemplateService) Deactivate(ctx context.Context, id uuid.UUID) error {
	return m.DeactivateFn(ctx, id)
}

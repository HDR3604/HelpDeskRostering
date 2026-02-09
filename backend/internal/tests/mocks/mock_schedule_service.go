package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/google/uuid"
)

var _ service.ScheduleServiceInterface = (*MockScheduleService)(nil)

// MockScheduleService provides function-based mocking for the schedule service.
// Set the Fn fields to control return values per test case.
type MockScheduleService struct {
	CreateFn       func(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error)
	GetByIDFn      func(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error)
	ListArchivedFn func(ctx context.Context) ([]*aggregate.Schedule, error)
	ListFn         func(ctx context.Context) ([]*aggregate.Schedule, error)
	ArchiveFn      func(ctx context.Context, id uuid.UUID) error
	UnarchiveFn    func(ctx context.Context, id uuid.UUID) error
	ActivateFn     func(ctx context.Context, id uuid.UUID) error
	DeactivateFn   func(ctx context.Context, id uuid.UUID) error
}

func (m *MockScheduleService) Create(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
	return m.CreateFn(ctx, schedule)
}

func (m *MockScheduleService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error) {
	return m.GetByIDFn(ctx, id)
}

func (m *MockScheduleService) ListArchived(ctx context.Context) ([]*aggregate.Schedule, error) {
	return m.ListArchivedFn(ctx)
}

func (m *MockScheduleService) List(ctx context.Context) ([]*aggregate.Schedule, error) {
	return m.ListFn(ctx)
}

func (m *MockScheduleService) Archive(ctx context.Context, id uuid.UUID) error {
	return m.ArchiveFn(ctx, id)
}

func (m *MockScheduleService) Unarchive(ctx context.Context, id uuid.UUID) error {
	return m.UnarchiveFn(ctx, id)
}

func (m *MockScheduleService) Activate(ctx context.Context, id uuid.UUID) error {
	return m.ActivateFn(ctx, id)
}

func (m *MockScheduleService) Deactivate(ctx context.Context, id uuid.UUID) error {
	return m.DeactivateFn(ctx, id)
}

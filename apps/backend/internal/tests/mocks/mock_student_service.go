package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
)

var _ service.StudentServiceInterface = (*MockStudentService)(nil)

type MockStudentService struct {
	ApplyFn          func(ctx context.Context, input service.ApplyInput) (*aggregate.Student, error)
	GetByIDFn        func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	GetMyProfileFn   func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	GetByEmailFn     func(ctx context.Context, email string) (*aggregate.Student, error)
	ListFn           func(ctx context.Context, status string) ([]*aggregate.Student, error)
	AcceptFn         func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	RejectFn         func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	DeactivateFn     func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	ActivateFn       func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	BulkDeactivateFn func(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error)
	BulkActivateFn   func(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error)
	UpdateFn         func(ctx context.Context, studentID int32, input service.UpdateStudentInput) (*aggregate.Student, error)
}

func (m *MockStudentService) Apply(ctx context.Context, input service.ApplyInput) (*aggregate.Student, error) {
	return m.ApplyFn(ctx, input)
}

func (m *MockStudentService) GetByID(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	return m.GetByIDFn(ctx, studentID)
}

func (m *MockStudentService) GetMyProfile(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	if m.GetMyProfileFn != nil {
		return m.GetMyProfileFn(ctx, studentID)
	}
	return m.GetByIDFn(ctx, studentID)
}

func (m *MockStudentService) GetByEmail(ctx context.Context, email string) (*aggregate.Student, error) {
	return m.GetByEmailFn(ctx, email)
}

func (m *MockStudentService) List(ctx context.Context, status string) ([]*aggregate.Student, error) {
	return m.ListFn(ctx, status)
}

func (m *MockStudentService) Accept(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	return m.AcceptFn(ctx, studentID)
}

func (m *MockStudentService) Reject(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	return m.RejectFn(ctx, studentID)
}

func (m *MockStudentService) Deactivate(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	return m.DeactivateFn(ctx, studentID)
}

func (m *MockStudentService) Activate(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	return m.ActivateFn(ctx, studentID)
}

func (m *MockStudentService) BulkDeactivate(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error) {
	return m.BulkDeactivateFn(ctx, studentIDs)
}

func (m *MockStudentService) BulkActivate(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error) {
	return m.BulkActivateFn(ctx, studentIDs)
}

func (m *MockStudentService) Update(ctx context.Context, studentID int32, input service.UpdateStudentInput) (*aggregate.Student, error) {
	return m.UpdateFn(ctx, studentID, input)
}

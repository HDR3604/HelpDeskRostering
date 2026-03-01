package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
)

var _ service.StudentServiceInterface = (*MockStudentService)(nil)

type MockStudentService struct {
	ApplyFn      func(ctx context.Context, input service.ApplyInput) (*aggregate.Student, error)
	GetByIDFn    func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	GetByEmailFn func(ctx context.Context, email string) (*aggregate.Student, error)
	ListFn       func(ctx context.Context, status string) ([]*aggregate.Student, error)
	AcceptFn     func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	RejectFn     func(ctx context.Context, studentID int32) (*aggregate.Student, error)
	UpdateFn     func(ctx context.Context, studentID int32, input service.UpdateStudentInput) (*aggregate.Student, error)
}

func (m *MockStudentService) Apply(ctx context.Context, input service.ApplyInput) (*aggregate.Student, error) {
	return m.ApplyFn(ctx, input)
}

func (m *MockStudentService) GetByID(ctx context.Context, studentID int32) (*aggregate.Student, error) {
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

func (m *MockStudentService) Update(ctx context.Context, studentID int32, input service.UpdateStudentInput) (*aggregate.Student, error) {
	return m.UpdateFn(ctx, studentID, input)
}

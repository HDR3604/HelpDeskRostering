package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/service"
)

type MockUserService struct {
	CreateFn                  func(ctx context.Context, firstName, lastName, email, password string, role aggregate.Role) (*aggregate.User, error)
	GetByIDFn                 func(ctx context.Context, userID string) (*aggregate.User, error)
	GetByEmailFn              func(ctx context.Context, email string) (*aggregate.User, error)
	UpdateFn                  func(ctx context.Context, userID string, input service.UpdateUserInput) error
	DeactivateByEmailDomainFn func(ctx context.Context, emailDomain aggregate.EmailDomain) error
	ListFn                    func(ctx context.Context) ([]*aggregate.User, error)
	ListByRoleFn              func(ctx context.Context, role string) ([]*aggregate.User, error)
	ListActiveFn              func(ctx context.Context) ([]*aggregate.User, error)
}

var _ service.UserServiceInterface = (*MockUserService)(nil)

func (m *MockUserService) Create(ctx context.Context, firstName, lastName, email, password string, role aggregate.Role) (*aggregate.User, error) {
	return m.CreateFn(ctx, firstName, lastName, email, password, role)
}

func (m *MockUserService) GetByID(ctx context.Context, userID string) (*aggregate.User, error) {
	return m.GetByIDFn(ctx, userID)
}

func (m *MockUserService) GetByEmail(ctx context.Context, email string) (*aggregate.User, error) {
	return m.GetByEmailFn(ctx, email)
}

func (m *MockUserService) Update(ctx context.Context, userID string, input service.UpdateUserInput) error {
	return m.UpdateFn(ctx, userID, input)
}

func (m *MockUserService) DeactivateByEmailDomain(ctx context.Context, emailDomain aggregate.EmailDomain) error {
	return m.DeactivateByEmailDomainFn(ctx, emailDomain)
}

func (m *MockUserService) List(ctx context.Context) ([]*aggregate.User, error) {
	return m.ListFn(ctx)
}

func (m *MockUserService) ListByRole(ctx context.Context, role string) ([]*aggregate.User, error) {
	return m.ListByRoleFn(ctx, role)
}

func (m *MockUserService) ListActive(ctx context.Context) ([]*aggregate.User, error) {
	return m.ListActiveFn(ctx)
}

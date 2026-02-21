package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
)

type MockUserRepository struct {
	CreateFn                  func(ctx context.Context, tx *sql.Tx, user *aggregate.User) (*aggregate.User, error)
	GetByIDFn                 func(ctx context.Context, tx *sql.Tx, userID string) (*aggregate.User, error)
	GetByEmailFn              func(ctx context.Context, tx *sql.Tx, email string) (*aggregate.User, error)
	UpdateFn                  func(ctx context.Context, tx *sql.Tx, user *aggregate.User) error
	DeactivateByEmailDomainFn func(ctx context.Context, tx *sql.Tx, emailDomain aggregate.EmailDomain) error
	ListFn                    func(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error)
	ListByRoleFn              func(ctx context.Context, tx *sql.Tx, role string) ([]*aggregate.User, error)
	ListActiveFn              func(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error)
}

var _ repository.UserRepositoryInterface = (*MockUserRepository)(nil)

func (m *MockUserRepository) Create(ctx context.Context, tx *sql.Tx, user *aggregate.User) (*aggregate.User, error) {
	return m.CreateFn(ctx, tx, user)
}

func (m *MockUserRepository) GetByID(ctx context.Context, tx *sql.Tx, userID string) (*aggregate.User, error) {
	return m.GetByIDFn(ctx, tx, userID)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*aggregate.User, error) {
	return m.GetByEmailFn(ctx, tx, email)
}

func (m *MockUserRepository) Update(ctx context.Context, tx *sql.Tx, user *aggregate.User) error {
	return m.UpdateFn(ctx, tx, user)
}

func (m *MockUserRepository) DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, emailDomain aggregate.EmailDomain) error {
	return m.DeactivateByEmailDomainFn(ctx, tx, emailDomain)
}

func (m *MockUserRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error) {
	return m.ListFn(ctx, tx)
}

func (m *MockUserRepository) ListByRole(ctx context.Context, tx *sql.Tx, role string) ([]*aggregate.User, error) {
	return m.ListByRoleFn(ctx, tx, role)
}

func (m *MockUserRepository) ListActive(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error) {
	return m.ListActiveFn(ctx, tx)
}

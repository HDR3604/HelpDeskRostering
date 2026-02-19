package user_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/service"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type UserServiceTestSuite struct {
	suite.Suite
	repo    *mocks.MockUserRepository
	service *service.UserService
	ctx     context.Context
}

func TestUserServiceTestSuite(t *testing.T) {
	suite.Run(t, new(UserServiceTestSuite))
}

func (s *UserServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockUserRepository{}
	s.service = service.NewUserService(zap.NewNop(), &mocks.StubTxManager{}, s.repo)
	s.ctx = context.Background()
}

// --- Helpers ---

func (s *UserServiceTestSuite) newAdminUser() *aggregate.User {
	return &aggregate.User{
		ID:       uuid.New(),
		Email:    "admin@uwi.edu",
		Password: "hashed_password",
		Role:     aggregate.Role_Admin,
		IsActive: true,
	}
}

func (s *UserServiceTestSuite) newStudentUser() *aggregate.User {
	return &aggregate.User{
		ID:       uuid.New(),
		Email:    "student@my.uwi.edu",
		Password: "hashed_password",
		Role:     aggregate.Role_Student,
		IsActive: true,
	}
}

// --- HashPassword ---

func (s *UserServiceTestSuite) TestHashPassword_Success() {
	hash, err := s.service.HashPassword("password1")

	s.Require().NoError(err)
	s.NotEmpty(hash)
	s.NotEqual("password1", hash)
}

func (s *UserServiceTestSuite) TestHashPassword_ProducesDifferentHashesSameInput() {
	hash1, err1 := s.service.HashPassword("password1")
	hash2, err2 := s.service.HashPassword("password1")

	s.Require().NoError(err1)
	s.Require().NoError(err2)
	s.NotEqual(hash1, hash2, "bcrypt should produce unique salted hashes")
}

// --- Create ---

func (s *UserServiceTestSuite) TestCreate_Success_Admin() {
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return nil, userErrors.ErrUserNotFound
	}
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, user *aggregate.User) (*aggregate.User, error) {
		return user, nil
	}

	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "password1", aggregate.Role_Admin)

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal("admin@uwi.edu", result.Email)
	s.Equal(aggregate.Role_Admin, result.Role)
	s.True(result.IsActive)
}

func (s *UserServiceTestSuite) TestCreate_Success_Student() {
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return nil, userErrors.ErrUserNotFound
	}
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, user *aggregate.User) (*aggregate.User, error) {
		return user, nil
	}

	result, err := s.service.Create(s.ctx, "student@my.uwi.edu", "password1", aggregate.Role_Student)

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal("student@my.uwi.edu", result.Email)
	s.Equal(aggregate.Role_Student, result.Role)
}

func (s *UserServiceTestSuite) TestCreate_EmailAlreadyExists() {
	existing := s.newAdminUser()
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return existing, nil
	}

	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "password1", aggregate.Role_Admin)

	s.ErrorIs(err, userErrors.ErrEmailAlreadyExists)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_GetByEmailRepositoryError() {
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return nil, errors.New("db connection error")
	}

	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "password1", aggregate.Role_Admin)

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_InvalidEmail() {
	result, err := s.service.Create(s.ctx, "not-a-valid-email", "password1", aggregate.Role_Admin)

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_InvalidRole() {
	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "password1", aggregate.Role("invalid_role"))

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_InvalidPassword_TooShort() {
	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "abc", aggregate.Role_Admin)

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_InvalidPassword_NoDigit() {
	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "passwordonly", aggregate.Role_Admin)

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_RoleEmailMismatch_AdminWithStudentDomain() {
	result, err := s.service.Create(s.ctx, "user@my.uwi.edu", "password1", aggregate.Role_Admin)

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_RoleEmailMismatch_StudentWithStaffDomain() {
	result, err := s.service.Create(s.ctx, "user@uwi.edu", "password1", aggregate.Role_Student)

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestCreate_RepositoryCreateFails() {
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return nil, userErrors.ErrUserNotFound
	}
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, user *aggregate.User) (*aggregate.User, error) {
		return nil, errors.New("db write error")
	}

	result, err := s.service.Create(s.ctx, "admin@uwi.edu", "password1", aggregate.Role_Admin)

	s.Require().Error(err)
	s.Nil(result)
}

// --- GetByID ---

func (s *UserServiceTestSuite) TestGetByID_Success() {
	expected := s.newAdminUser()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		s.Equal(expected.ID.String(), id)
		return expected, nil
	}

	result, err := s.service.GetByID(s.ctx, expected.ID.String())

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal(expected.ID, result.ID)
	s.Equal(expected.Email, result.Email)
}

func (s *UserServiceTestSuite) TestGetByID_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return nil, userErrors.ErrUserNotFound
	}

	result, err := s.service.GetByID(s.ctx, uuid.New().String())

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestGetByID_RepositoryError() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return nil, errors.New("db error")
	}

	result, err := s.service.GetByID(s.ctx, uuid.New().String())

	s.Require().Error(err)
	s.Nil(result)
}

// --- GetByEmail ---

func (s *UserServiceTestSuite) TestGetByEmail_Success() {
	expected := s.newAdminUser()
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		s.Equal(expected.Email, email)
		return expected, nil
	}

	result, err := s.service.GetByEmail(s.ctx, expected.Email)

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal(expected.Email, result.Email)
}

func (s *UserServiceTestSuite) TestGetByEmail_NotFound() {
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return nil, userErrors.ErrUserNotFound
	}

	result, err := s.service.GetByEmail(s.ctx, "nonexistent@uwi.edu")

	s.Require().Error(err)
	s.Nil(result)
}

func (s *UserServiceTestSuite) TestGetByEmail_RepositoryError() {
	s.repo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, email string) (*aggregate.User, error) {
		return nil, errors.New("db error")
	}

	result, err := s.service.GetByEmail(s.ctx, "admin@uwi.edu")

	s.Require().Error(err)
	s.Nil(result)
}

// --- Update ---

func (s *UserServiceTestSuite) TestUpdate_Email_Success() {
	user := s.newAdminUser()
	newEmail := "new.admin@uwi.edu"
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return user, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, u *aggregate.User) error {
		s.Equal(newEmail, u.Email)
		return nil
	}

	err := s.service.Update(s.ctx, user.ID.String(), service.UpdateUserInput{Email: &newEmail})

	s.Require().NoError(err)
}

func (s *UserServiceTestSuite) TestUpdate_Role_Success() {
	user := s.newAdminUser()
	newRole := aggregate.Role_Student
	newEmail := "admin@my.uwi.edu"
	user.Email = newEmail // must match student domain
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return user, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, u *aggregate.User) error {
		s.Equal(newRole, u.Role)
		return nil
	}

	err := s.service.Update(s.ctx, user.ID.String(), service.UpdateUserInput{Role: &newRole})

	s.Require().NoError(err)
}

func (s *UserServiceTestSuite) TestUpdate_Deactivate_Success() {
	user := s.newAdminUser()
	isActive := false
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return user, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, u *aggregate.User) error {
		s.False(u.IsActive)
		return nil
	}

	err := s.service.Update(s.ctx, user.ID.String(), service.UpdateUserInput{IsActive: &isActive})

	s.Require().NoError(err)
}

func (s *UserServiceTestSuite) TestUpdate_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return nil, userErrors.ErrUserNotFound
	}

	err := s.service.Update(s.ctx, uuid.New().String(), service.UpdateUserInput{})

	s.Require().Error(err)
}

func (s *UserServiceTestSuite) TestUpdate_RepositoryError() {
	user := s.newAdminUser()
	newEmail := "new.admin@uwi.edu"
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id string) (*aggregate.User, error) {
		return user, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, u *aggregate.User) error {
		return errors.New("db update error")
	}

	err := s.service.Update(s.ctx, user.ID.String(), service.UpdateUserInput{Email: &newEmail})

	s.Require().Error(err)
	s.Contains(err.Error(), "db update error")
}

// --- DeactivateByEmailDomain ---

func (s *UserServiceTestSuite) TestDeactivateByEmailDomain_StudentDomain_Success() {
	s.repo.DeactivateByEmailDomainFn = func(_ context.Context, _ *sql.Tx, domain aggregate.EmailDomain) error {
		s.Equal(aggregate.EmailDomain_Student, domain)
		return nil
	}

	err := s.service.DeactivateByEmailDomain(s.ctx, aggregate.EmailDomain_Student)

	s.Require().NoError(err)
}

func (s *UserServiceTestSuite) TestDeactivateByEmailDomain_StaffDomain_Success() {
	s.repo.DeactivateByEmailDomainFn = func(_ context.Context, _ *sql.Tx, domain aggregate.EmailDomain) error {
		s.Equal(aggregate.EmailDomain_Staff, domain)
		return nil
	}

	err := s.service.DeactivateByEmailDomain(s.ctx, aggregate.EmailDomain_Staff)

	s.Require().NoError(err)
}

func (s *UserServiceTestSuite) TestDeactivateByEmailDomain_RepositoryError() {
	s.repo.DeactivateByEmailDomainFn = func(_ context.Context, _ *sql.Tx, domain aggregate.EmailDomain) error {
		return errors.New("db error")
	}

	err := s.service.DeactivateByEmailDomain(s.ctx, aggregate.EmailDomain_Student)

	s.Require().Error(err)
}

// --- List ---

func (s *UserServiceTestSuite) TestList_Success() {
	expected := []*aggregate.User{s.newAdminUser(), s.newStudentUser()}
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.User, error) {
		return expected, nil
	}

	result, err := s.service.List(s.ctx)

	s.Require().NoError(err)
	s.Len(result, 2)
}

func (s *UserServiceTestSuite) TestList_Empty() {
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.User, error) {
		return []*aggregate.User{}, nil
	}

	result, err := s.service.List(s.ctx)

	s.Require().NoError(err)
	s.Empty(result)
}

func (s *UserServiceTestSuite) TestList_RepositoryError() {
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.User, error) {
		return nil, errors.New("db error")
	}

	result, err := s.service.List(s.ctx)

	s.Require().Error(err)
	s.Nil(result)
}

// --- ListByRole ---

func (s *UserServiceTestSuite) TestListByRole_Admin_Success() {
	expected := []*aggregate.User{s.newAdminUser()}
	s.repo.ListByRoleFn = func(_ context.Context, _ *sql.Tx, role string) ([]*aggregate.User, error) {
		s.Equal(string(aggregate.Role_Admin), role)
		return expected, nil
	}

	result, err := s.service.ListByRole(s.ctx, string(aggregate.Role_Admin))

	s.Require().NoError(err)
	s.Len(result, 1)
	s.Equal(aggregate.Role_Admin, result[0].Role)
}

func (s *UserServiceTestSuite) TestListByRole_Student_Success() {
	expected := []*aggregate.User{s.newStudentUser()}
	s.repo.ListByRoleFn = func(_ context.Context, _ *sql.Tx, role string) ([]*aggregate.User, error) {
		s.Equal(string(aggregate.Role_Student), role)
		return expected, nil
	}

	result, err := s.service.ListByRole(s.ctx, string(aggregate.Role_Student))

	s.Require().NoError(err)
	s.Len(result, 1)
	s.Equal(aggregate.Role_Student, result[0].Role)
}

func (s *UserServiceTestSuite) TestListByRole_Empty() {
	s.repo.ListByRoleFn = func(_ context.Context, _ *sql.Tx, role string) ([]*aggregate.User, error) {
		return []*aggregate.User{}, nil
	}

	result, err := s.service.ListByRole(s.ctx, string(aggregate.Role_Admin))

	s.Require().NoError(err)
	s.Empty(result)
}

func (s *UserServiceTestSuite) TestListByRole_RepositoryError() {
	s.repo.ListByRoleFn = func(_ context.Context, _ *sql.Tx, role string) ([]*aggregate.User, error) {
		return nil, errors.New("db error")
	}

	result, err := s.service.ListByRole(s.ctx, string(aggregate.Role_Admin))

	s.Require().Error(err)
	s.Nil(result)
}

// --- ListActive ---

func (s *UserServiceTestSuite) TestListActive_Success() {
	expected := []*aggregate.User{s.newAdminUser(), s.newStudentUser()}
	s.repo.ListActiveFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.User, error) {
		return expected, nil
	}

	result, err := s.service.ListActive(s.ctx)

	s.Require().NoError(err)
	s.Len(result, 2)
	for _, u := range result {
		s.True(u.IsActive)
	}
}

func (s *UserServiceTestSuite) TestListActive_Empty() {
	s.repo.ListActiveFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.User, error) {
		return []*aggregate.User{}, nil
	}

	result, err := s.service.ListActive(s.ctx)

	s.Require().NoError(err)
	s.Empty(result)
}

func (s *UserServiceTestSuite) TestListActive_RepositoryError() {
	s.repo.ListActiveFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.User, error) {
		return nil, errors.New("db error")
	}

	result, err := s.service.ListActive(s.ctx)

	s.Require().Error(err)
	s.Nil(result)
}

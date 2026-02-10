package schedule_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ShiftTemplateServiceTestSuite struct {
	suite.Suite
	repo    *mocks.MockShiftTemplateRepository
	service service.ShiftTemplateServiceInterface
	authCtx context.Context
	userID  uuid.UUID
}

func TestShiftTemplateServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ShiftTemplateServiceTestSuite))
}

func (s *ShiftTemplateServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockShiftTemplateRepository{}
	s.userID = uuid.New()
	svc := service.NewShiftTemplateService(zap.NewNop(), s.repo, &mocks.StubTxManager{})
	s.service = svc
	s.authCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID: s.userID.String(),
		Role:   "admin",
	})
}

func (s *ShiftTemplateServiceTestSuite) newShiftTemplate() *aggregate.ShiftTemplate {
	return &aggregate.ShiftTemplate{
		ID:        uuid.New(),
		Name:      "Morning Shift",
		DayOfWeek: 1,
		StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
		EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
		MinStaff:  2,
		MaxStaff:  nil,
		CourseDemands: []aggregate.CourseDemand{
			{CourseCode: "CS101", TutorsRequired: 1, Weight: 1.0},
		},
		IsActive:  true,
		CreatedAt: time.Now(),
	}
}

// --- Create ---

func (s *ShiftTemplateServiceTestSuite) TestCreate_Success() {
	input := s.newShiftTemplate()
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
		return t, nil
	}

	result, err := s.service.Create(s.authCtx, input)

	s.Require().NoError(err)
	s.Equal(input.Name, result.Name)
}

func (s *ShiftTemplateServiceTestSuite) TestCreate_MissingAuthContext() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
		return t, nil
	}

	result, err := s.service.Create(context.Background(), s.newShiftTemplate())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

func (s *ShiftTemplateServiceTestSuite) TestCreate_RepositoryError() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, _ *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
		return nil, fmt.Errorf("db error")
	}

	result, err := s.service.Create(s.authCtx, s.newShiftTemplate())

	s.Require().Error(err)
	s.Nil(result)
	s.Contains(err.Error(), "db error")
}

// --- GetByID ---

func (s *ShiftTemplateServiceTestSuite) TestGetByID_Success() {
	expected := s.newShiftTemplate()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	result, err := s.service.GetByID(s.authCtx, expected.ID)

	s.Require().NoError(err)
	s.Equal(expected.ID, result.ID)
}

func (s *ShiftTemplateServiceTestSuite) TestGetByID_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return nil, scheduleErrors.ErrShiftTemplateNotFound
	}

	result, err := s.service.GetByID(s.authCtx, uuid.New())

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrShiftTemplateNotFound)
	s.Nil(result)
}

func (s *ShiftTemplateServiceTestSuite) TestGetByID_MissingAuthContext() {
	result, err := s.service.GetByID(context.Background(), uuid.New())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- List ---

func (s *ShiftTemplateServiceTestSuite) TestList_Success() {
	expected := []*aggregate.ShiftTemplate{s.newShiftTemplate(), s.newShiftTemplate()}
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
		return expected, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Len(result, 2)
}

func (s *ShiftTemplateServiceTestSuite) TestList_Empty() {
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{}, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Empty(result)
}

// --- ListAll ---

func (s *ShiftTemplateServiceTestSuite) TestListAll_Success() {
	expected := []*aggregate.ShiftTemplate{s.newShiftTemplate(), s.newShiftTemplate(), s.newShiftTemplate()}
	s.repo.ListAllFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
		return expected, nil
	}

	result, err := s.service.ListAll(s.authCtx)

	s.Require().NoError(err)
	s.Len(result, 3)
}

// --- Update ---

func (s *ShiftTemplateServiceTestSuite) TestUpdate_Success() {
	existing := s.newShiftTemplate()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
		s.Equal(existing.ID, id)
		return existing, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, t *aggregate.ShiftTemplate) error {
		s.Equal("Updated Shift", t.Name)
		s.Equal(int32(3), t.DayOfWeek)
		return nil
	}

	params := service.UpdateShiftTemplateParams{
		Name:      "Updated Shift",
		DayOfWeek: 3,
		StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
		EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
		MinStaff:  1,
		MaxStaff:  nil,
		CourseDemands: []aggregate.CourseDemand{
			{CourseCode: "CS202", TutorsRequired: 2, Weight: 1.5},
		},
	}

	result, err := s.service.Update(s.authCtx, existing.ID, params)

	s.Require().NoError(err)
	s.Equal("Updated Shift", result.Name)
	s.Equal(int32(3), result.DayOfWeek)
}

func (s *ShiftTemplateServiceTestSuite) TestUpdate_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return nil, scheduleErrors.ErrShiftTemplateNotFound
	}

	params := service.UpdateShiftTemplateParams{
		Name:      "Updated Shift",
		DayOfWeek: 1,
		StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
		EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
		MinStaff:  1,
	}

	result, err := s.service.Update(s.authCtx, uuid.New(), params)

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrShiftTemplateNotFound)
	s.Nil(result)
}

func (s *ShiftTemplateServiceTestSuite) TestUpdate_ValidationError() {
	existing := s.newShiftTemplate()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return existing, nil
	}

	params := service.UpdateShiftTemplateParams{
		Name:      "",
		DayOfWeek: 1,
		StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
		EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
		MinStaff:  1,
	}

	result, err := s.service.Update(s.authCtx, existing.ID, params)

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrInvalidShiftTemplateName)
	s.Nil(result)
}

func (s *ShiftTemplateServiceTestSuite) TestUpdate_MissingAuthContext() {
	params := service.UpdateShiftTemplateParams{
		Name:      "Updated Shift",
		DayOfWeek: 1,
		StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
		EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
		MinStaff:  1,
	}

	result, err := s.service.Update(context.Background(), uuid.New(), params)

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- Activate ---

func (s *ShiftTemplateServiceTestSuite) TestActivate_Success() {
	template := s.newShiftTemplate()
	template.IsActive = false

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return template, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.ShiftTemplate) error {
		s.True(updated.IsActive)
		return nil
	}

	err := s.service.Activate(s.authCtx, template.ID)

	s.Require().NoError(err)
}

func (s *ShiftTemplateServiceTestSuite) TestActivate_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return nil, scheduleErrors.ErrShiftTemplateNotFound
	}

	err := s.service.Activate(s.authCtx, uuid.New())

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrShiftTemplateNotFound)
}

// --- Deactivate ---

func (s *ShiftTemplateServiceTestSuite) TestDeactivate_Success() {
	template := s.newShiftTemplate()
	template.IsActive = true

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return template, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.ShiftTemplate) error {
		s.False(updated.IsActive)
		return nil
	}

	err := s.service.Deactivate(s.authCtx, template.ID)

	s.Require().NoError(err)
}

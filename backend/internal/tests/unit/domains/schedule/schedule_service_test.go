package schedule_test

import (
	"context"
	"database/sql"
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

type ScheduleServiceTestSuite struct {
	suite.Suite
	repo    *mocks.MockScheduleRepository
	service service.ScheduleServiceInterface
	authCtx context.Context
}

func TestScheduleServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleServiceTestSuite))
}

func (s *ScheduleServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockScheduleRepository{}
	svc := service.NewScheduleService(zap.NewNop(), s.repo, &mocks.StubTxManager{})
	s.service = svc
	s.authCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID: uuid.New().String(),
		Role:   "admin",
	})
}

func (s *ScheduleServiceTestSuite) newSchedule() *aggregate.Schedule {
	return &aggregate.Schedule{
		ScheduleID:    uuid.New(),
		Title:         "Test Schedule",
		IsActive:      false,
		EffectiveFrom: time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
	}
}

// --- Create ---

func (s *ScheduleServiceTestSuite) TestCreate_Success() {
	input := s.newSchedule()
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
		return schedule, nil
	}

	result, err := s.service.Create(s.authCtx, input)

	s.Require().NoError(err)
	s.Equal(input.Title, result.Title)
}

func (s *ScheduleServiceTestSuite) TestCreate_MissingAuthContext() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
		return schedule, nil
	}

	result, err := s.service.Create(context.Background(), s.newSchedule())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- GetByID ---

func (s *ScheduleServiceTestSuite) TestGetByID_Success() {
	expected := s.newSchedule()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.Schedule, error) {
		s.Equal(expected.ScheduleID, id)
		return expected, nil
	}

	result, err := s.service.GetByID(s.authCtx, expected.ScheduleID)

	s.Require().NoError(err)
	s.Equal(expected.ScheduleID, result.ScheduleID)
}

func (s *ScheduleServiceTestSuite) TestGetByID_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.Schedule, error) {
		return nil, scheduleErrors.ErrNotFound
	}

	result, err := s.service.GetByID(s.authCtx, uuid.New())

	s.Require().Error(err)
	s.Nil(result)
}

// --- List ---

func (s *ScheduleServiceTestSuite) TestList_Success() {
	expected := []*aggregate.Schedule{s.newSchedule(), s.newSchedule()}
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.Schedule, error) {
		return expected, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Len(result, 2)
}

func (s *ScheduleServiceTestSuite) TestList_MissingAuthContext() {
	result, err := s.service.List(context.Background())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

func (s *ScheduleServiceTestSuite) TestListArchived_Success() {
	expected := []*aggregate.Schedule{s.newSchedule()}
	s.repo.ListArchivedFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.Schedule, error) {
		return expected, nil
	}

	result, err := s.service.ListArchived(s.authCtx)

	s.Require().NoError(err)
	s.Len(result, 1)
}

// --- Archive ---

func (s *ScheduleServiceTestSuite) TestArchive_Success() {
	schedule := s.newSchedule()
	schedule.IsActive = true

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.Schedule, error) {
		return schedule, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.Schedule) error {
		s.False(updated.IsActive, "archive should deactivate")
		s.NotNil(updated.ArchivedAt)
		return nil
	}

	err := s.service.Archive(s.authCtx, schedule.ScheduleID)

	s.Require().NoError(err)
}

func (s *ScheduleServiceTestSuite) TestArchive_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.Schedule, error) {
		return nil, scheduleErrors.ErrNotFound
	}

	err := s.service.Archive(s.authCtx, uuid.New())

	s.Require().Error(err)
}

// --- Unarchive ---

func (s *ScheduleServiceTestSuite) TestUnarchive_Success() {
	archivedAt := time.Now()
	schedule := s.newSchedule()
	schedule.ArchivedAt = &archivedAt

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.Schedule, error) {
		return schedule, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.Schedule) error {
		s.Nil(updated.ArchivedAt)
		return nil
	}

	err := s.service.Unarchive(s.authCtx, schedule.ScheduleID)

	s.Require().NoError(err)
}

// --- Activate ---

func (s *ScheduleServiceTestSuite) TestActivate_Success() {
	schedule := s.newSchedule()
	schedule.IsActive = false

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.Schedule, error) {
		return schedule, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.Schedule) error {
		s.True(updated.IsActive)
		return nil
	}

	err := s.service.Activate(s.authCtx, schedule.ScheduleID)

	s.Require().NoError(err)
}

// --- Deactivate ---

func (s *ScheduleServiceTestSuite) TestDeactivate_Success() {
	schedule := s.newSchedule()
	schedule.IsActive = true

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.Schedule, error) {
		return schedule, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.Schedule) error {
		s.False(updated.IsActive)
		return nil
	}

	err := s.service.Deactivate(s.authCtx, schedule.ScheduleID)

	s.Require().NoError(err)
}

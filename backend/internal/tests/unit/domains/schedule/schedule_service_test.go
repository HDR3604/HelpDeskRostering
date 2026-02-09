package schedule_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ScheduleServiceTestSuite struct {
	suite.Suite
	repo          *mocks.MockScheduleRepository
	generationSvc *mocks.MockScheduleGenerationService
	schedulerSvc  *mocks.MockSchedulerService
	service       service.ScheduleServiceInterface
	authCtx       context.Context
	userID        uuid.UUID
}

func TestScheduleServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleServiceTestSuite))
}

func (s *ScheduleServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockScheduleRepository{}
	s.generationSvc = &mocks.MockScheduleGenerationService{}
	s.schedulerSvc = &mocks.MockSchedulerService{}
	s.userID = uuid.New()
	svc := service.NewScheduleService(zap.NewNop(), s.repo, &mocks.StubTxManager{}, s.generationSvc, s.schedulerSvc)
	s.service = svc
	s.authCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID: s.userID.String(),
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

// --- GenerateSchedule ---

func (s *ScheduleServiceTestSuite) newGenerateParams() service.GenerateScheduleParams {
	return service.GenerateScheduleParams{
		ConfigID:      uuid.New(),
		Title:         "Generated Schedule",
		EffectiveFrom: time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
		Request: types.GenerateScheduleRequest{
			Assistants: []types.Assistant{
				{ID: "a1", Courses: []string{"CS101"}, MinHours: 4, MaxHours: 10},
			},
			Shifts: []types.Shift{
				{ID: "s1", DayOfWeek: 1, Start: "08:00:00", End: "12:00:00"},
			},
		},
	}
}

func (s *ScheduleServiceTestSuite) newSchedulerResponse() *types.GenerateScheduleResponse {
	return &types.GenerateScheduleResponse{
		Status: types.ScheduleStatus_Optimal,
		Assignments: []types.Assignment{
			{AssistantID: "a1", ShiftID: "s1", DayOfWeek: 1, Start: "08:00:00", End: "12:00:00"},
		},
		AssistantHours: map[string]float32{"a1": 4.0},
		Metadata: types.GenerateScheduleMetadata{
			SolverStatusCode: 2,
		},
	}
}

func (s *ScheduleServiceTestSuite) setupGenerationMocks(generationID uuid.UUID) {
	s.generationSvc.CreateFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) (*aggregate.ScheduleGeneration, error) {
		return &aggregate.ScheduleGeneration{ID: generationID, Status: aggregate.GenerationStatus_Pending}, nil
	}
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error {
		return nil
	}
	s.generationSvc.MarkCompletedFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) error {
		return nil
	}
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, _ string) error {
		return nil
	}
	s.generationSvc.MarkInfeasibleFn = func(_ context.Context, _ uuid.UUID, _ string, _ string) error {
		return nil
	}
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_Success() {
	generationID := uuid.New()
	params := s.newGenerateParams()

	s.setupGenerationMocks(generationID)
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return s.newSchedulerResponse(), nil
	}
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
		schedule.CreatedAt = time.Now()
		return schedule, nil
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal(params.Title, result.Title)
	s.Equal(s.userID, result.CreatedBy)
	s.Require().NotNil(result.GenerationID)
	s.Equal(generationID, *result.GenerationID)
	s.NotNil(result.SchedulerMetadata)

	// Verify assignments were persisted
	var assignments []types.Assignment
	s.Require().NoError(json.Unmarshal(result.Assignments, &assignments))
	s.Len(assignments, 1)
	s.Equal("a1", assignments[0].AssistantID)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_MissingAuthContext() {
	result, err := s.service.GenerateSchedule(context.Background(), s.newGenerateParams())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_SchedulerFailure() {
	generationID := uuid.New()
	params := s.newGenerateParams()

	s.setupGenerationMocks(generationID)

	var failedGenID uuid.UUID
	var failedMsg string
	s.generationSvc.MarkFailedFn = func(_ context.Context, id uuid.UUID, msg string) error {
		failedGenID = id
		failedMsg = msg
		return nil
	}

	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return nil, schedulerErrors.ErrSchedulerUnavailable
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.ErrorIs(err, schedulerErrors.ErrSchedulerUnavailable)
	s.Nil(result)
	s.Equal(generationID, failedGenID)
	s.Contains(failedMsg, "scheduler service is not available")
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_Infeasible() {
	generationID := uuid.New()
	params := s.newGenerateParams()

	s.setupGenerationMocks(generationID)

	var infeasibleGenID uuid.UUID
	s.generationSvc.MarkInfeasibleFn = func(_ context.Context, id uuid.UUID, _ string, _ string) error {
		infeasibleGenID = id
		return nil
	}

	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return nil, schedulerErrors.ErrInfeasible
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.ErrorIs(err, schedulerErrors.ErrInfeasible)
	s.Nil(result)
	s.Equal(generationID, infeasibleGenID)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_CreateGenerationFails() {
	params := s.newGenerateParams()

	s.generationSvc.CreateFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) (*aggregate.ScheduleGeneration, error) {
		return nil, fmt.Errorf("db error")
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.Require().Error(err)
	s.Nil(result)
	s.Contains(err.Error(), "db error")
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_PersistScheduleFails() {
	generationID := uuid.New()
	params := s.newGenerateParams()

	s.setupGenerationMocks(generationID)
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return s.newSchedulerResponse(), nil
	}

	var failedGenID uuid.UUID
	s.generationSvc.MarkFailedFn = func(_ context.Context, id uuid.UUID, _ string) error {
		failedGenID = id
		return nil
	}

	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, _ *aggregate.Schedule) (*aggregate.Schedule, error) {
		return nil, fmt.Errorf("db write error")
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.Require().Error(err)
	s.Nil(result)
	s.Equal(generationID, failedGenID)
}

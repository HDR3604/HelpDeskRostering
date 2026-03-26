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
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ScheduleServiceTestSuite struct {
	suite.Suite
	repo               *mocks.MockScheduleRepository
	generationSvc      *mocks.MockScheduleGenerationService
	jobEnqueuer        *mocks.MockJobEnqueuer
	shiftTemplateSvc   *mocks.MockShiftTemplateService
	schedulerConfigSvc *mocks.MockSchedulerConfigService
	service            service.ScheduleServiceInterface
	authCtx            context.Context
	userID             uuid.UUID
}

func TestScheduleServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleServiceTestSuite))
}

func (s *ScheduleServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockScheduleRepository{}
	s.generationSvc = &mocks.MockScheduleGenerationService{}
	s.jobEnqueuer = &mocks.MockJobEnqueuer{}
	s.shiftTemplateSvc = &mocks.MockShiftTemplateService{}
	s.schedulerConfigSvc = &mocks.MockSchedulerConfigService{}
	s.userID = uuid.New()
	svc := service.NewScheduleService(zap.NewNop(), s.repo, &mocks.StubTxManager{}, s.generationSvc, s.jobEnqueuer, s.shiftTemplateSvc, s.schedulerConfigSvc)
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
	s.repo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*aggregate.Schedule, error) {
		return nil, scheduleErrors.ErrNotFound
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
		ConfigID:      uuid.MustParse("44444444-4444-4444-4444-444444444444"),
		Title:         "Generated Schedule",
		EffectiveFrom: time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
		Assistants: []types.Assistant{
			{ID: "a1", Courses: []string{"CS101"}, MinHours: 4, MaxHours: 10},
		},
	}
}

func (s *ScheduleServiceTestSuite) setupShiftTemplateAndConfigMocks() {
	s.shiftTemplateSvc.ListFn = func(_ context.Context) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{
			{
				ID:        uuid.MustParse("55555555-5555-5555-5555-555555555555"),
				Name:      "Morning Shift",
				DayOfWeek: 1,
				StartTime: time.Date(0, 1, 1, 8, 0, 0, 0, time.UTC),
				EndTime:   time.Date(0, 1, 1, 12, 0, 0, 0, time.UTC),
				MinStaff:  2,
				CourseDemands: []aggregate.CourseDemand{
					{CourseCode: "CS101", TutorsRequired: 1, Weight: 1.0},
				},
				IsActive: true,
			},
		}, nil
	}
	s.schedulerConfigSvc.GetByIDFn = func(_ context.Context, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return &aggregate.SchedulerConfig{
			ID:                     id,
			Name:                   "Default",
			CourseShortfallPenalty: 1.0,
			MinHoursPenalty:        10.0,
			MaxHoursPenalty:        5.0,
			UnderstaffedPenalty:    100.0,
			ExtraHoursPenalty:      5.0,
			MaxExtraPenalty:        20.0,
			BaselineHoursTarget:    6,
			LogSolverOutput:        false,
		}, nil
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

	s.setupShiftTemplateAndConfigMocks()
	s.setupGenerationMocks(generationID)

	var enqueuedArgs service.ScheduleGenerationJobArgs
	s.jobEnqueuer.EnqueueScheduleGenerationFn = func(_ context.Context, args service.ScheduleGenerationJobArgs) error {
		enqueuedArgs = args
		return nil
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal(generationID, result.ID)
	s.Equal(aggregate.GenerationStatus_Pending, result.Status)

	// Verify the job was enqueued with correct args
	s.Equal(generationID, enqueuedArgs.GenerationID)
	s.Equal(params.Title, enqueuedArgs.Title)
	s.Equal(s.userID, enqueuedArgs.CreatedBy)
	s.Len(enqueuedArgs.RequestPayload.Shifts, 1)
	s.Equal(float32(100.0), enqueuedArgs.RequestPayload.SchedulerConfig.UnderstaffedPenalty)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_MissingAuthContext() {
	result, err := s.service.GenerateSchedule(context.Background(), s.newGenerateParams())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_EnqueueFails() {
	generationID := uuid.New()
	params := s.newGenerateParams()

	s.setupShiftTemplateAndConfigMocks()
	s.setupGenerationMocks(generationID)

	s.jobEnqueuer.EnqueueScheduleGenerationFn = func(_ context.Context, _ service.ScheduleGenerationJobArgs) error {
		return fmt.Errorf("queue unavailable")
	}

	var failedGenID uuid.UUID
	s.generationSvc.MarkFailedFn = func(_ context.Context, id uuid.UUID, _ string) error {
		failedGenID = id
		return nil
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.Require().Error(err)
	s.Nil(result)
	s.Contains(err.Error(), "queue unavailable")
	s.Equal(generationID, failedGenID)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_InvalidTitle() {
	params := s.newGenerateParams()
	params.Title = ""

	var createCalled bool
	s.generationSvc.CreateFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) (*aggregate.ScheduleGeneration, error) {
		createCalled = true
		return nil, nil
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.ErrorIs(err, scheduleErrors.ErrInvalidTitle)
	s.Nil(result)
	s.False(createCalled, "generation should not be created for invalid input")
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_CreateGenerationFails() {
	params := s.newGenerateParams()

	s.setupShiftTemplateAndConfigMocks()
	s.generationSvc.CreateFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) (*aggregate.ScheduleGeneration, error) {
		return nil, fmt.Errorf("db error")
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.Require().Error(err)
	s.Nil(result)
	s.Contains(err.Error(), "db error")
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_NoActiveShiftTemplates() {
	params := s.newGenerateParams()

	s.shiftTemplateSvc.ListFn = func(_ context.Context) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{}, nil
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.ErrorIs(err, scheduleErrors.ErrNoActiveShiftTemplates)
	s.Nil(result)
}

func (s *ScheduleServiceTestSuite) TestGenerateSchedule_ConfigNotFound() {
	params := s.newGenerateParams()

	s.shiftTemplateSvc.ListFn = func(_ context.Context) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{
			{
				ID:        uuid.New(),
				Name:      "Shift",
				DayOfWeek: 0,
				StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
				EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
				MinStaff:  1,
				IsActive:  true,
			},
		}, nil
	}
	s.schedulerConfigSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	result, err := s.service.GenerateSchedule(s.authCtx, params)

	s.ErrorIs(err, scheduleErrors.ErrSchedulerConfigNotFound)
	s.Nil(result)
}

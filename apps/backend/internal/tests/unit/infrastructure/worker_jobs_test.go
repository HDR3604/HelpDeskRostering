package infrastructure_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/jobqueue/jobs"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/rivertype"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

// ── Schedule Generation Worker ─────────────────────────────────────────

type ScheduleGenerationWorkerSuite struct {
	suite.Suite
	generationSvc *mocks.MockScheduleGenerationService
	schedulerSvc  *mocks.MockSchedulerService
	scheduleRepo  *mocks.MockScheduleRepository
	txManager     *mocks.StubTxManager
	worker        *jobs.ScheduleGenerationWorker
}

func TestScheduleGenerationWorkerSuite(t *testing.T) {
	suite.Run(t, new(ScheduleGenerationWorkerSuite))
}

func (s *ScheduleGenerationWorkerSuite) SetupTest() {
	s.generationSvc = &mocks.MockScheduleGenerationService{}
	s.schedulerSvc = &mocks.MockSchedulerService{}
	s.scheduleRepo = &mocks.MockScheduleRepository{}
	s.txManager = &mocks.StubTxManager{}
	s.worker = jobs.NewScheduleGenerationWorker(
		zap.NewNop(), s.generationSvc, s.schedulerSvc, s.scheduleRepo, s.txManager,
	)
}

func (s *ScheduleGenerationWorkerSuite) newArgs() jobs.ScheduleGenerationArgs {
	return jobs.ScheduleGenerationArgs{
		GenerationID:  uuid.New(),
		Title:         "Test Schedule",
		EffectiveFrom: "2026-09-01",
		EffectiveTo:   nil,
		CreatedBy:     uuid.New(),
		RequestPayload: types.GenerateScheduleRequest{
			Assistants: []types.Assistant{{ID: "1", MinHours: 4, MaxHours: 10}},
			Shifts:     []types.Shift{{ID: "s1", DayOfWeek: 0, Start: "08:00:00", End: "12:00:00", MinStaff: 1}},
		},
	}
}

func (s *ScheduleGenerationWorkerSuite) newResponse() *types.GenerateScheduleResponse {
	return &types.GenerateScheduleResponse{
		Status:      types.ScheduleStatus_Optimal,
		Assignments: []types.Assignment{{AssistantID: "1", ShiftID: "s1", DayOfWeek: 0, Start: "08:00:00", End: "12:00:00"}},
		Metadata:    types.GenerateScheduleMetadata{SolverStatusCode: 2},
	}
}

func (s *ScheduleGenerationWorkerSuite) newJob(args jobs.ScheduleGenerationArgs) *river.Job[jobs.ScheduleGenerationArgs] {
	return &river.Job[jobs.ScheduleGenerationArgs]{
		JobRow: &rivertype.JobRow{
			Attempt:     1,
			MaxAttempts: 3,
		},
		Args: args,
	}
}

func (s *ScheduleGenerationWorkerSuite) setupHappyPath(args jobs.ScheduleGenerationArgs) (completedScheduleID *uuid.UUID) {
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error { return nil }
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return s.newResponse(), nil
	}
	schedID := uuid.New()
	completedScheduleID = &schedID
	s.scheduleRepo.CreateFn = func(_ context.Context, _ *sql.Tx, sched *aggregate.Schedule) (*aggregate.Schedule, error) {
		sched.ScheduleID = schedID
		sched.CreatedAt = time.Now()
		return sched, nil
	}
	s.generationSvc.MarkCompletedFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) error { return nil }
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, _ string) error { return nil }
	s.generationSvc.MarkInfeasibleFn = func(_ context.Context, _ uuid.UUID, _ string, _ string) error { return nil }
	return completedScheduleID
}

func (s *ScheduleGenerationWorkerSuite) TestWork_Success() {
	args := s.newArgs()
	completedScheduleID := s.setupHappyPath(args)

	var capturedScheduleID uuid.UUID
	s.generationSvc.MarkCompletedFn = func(_ context.Context, _ uuid.UUID, scheduleID uuid.UUID, _ string) error {
		capturedScheduleID = scheduleID
		return nil
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.NoError(err)
	s.Equal(*completedScheduleID, capturedScheduleID)
}

func (s *ScheduleGenerationWorkerSuite) TestWork_SchedulerUnavailable_ReturnsErrorForRetry() {
	args := s.newArgs()
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error { return nil }
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, _ string) error { return nil }
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return nil, schedulerErrors.ErrSchedulerUnavailable
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.Error(err, "transient error should be returned so River retries")
}

func (s *ScheduleGenerationWorkerSuite) TestWork_SchedulerPermanentError_MarksFailed() {
	args := s.newArgs()
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error { return nil }

	var failedMsg string
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, msg string) error {
		failedMsg = msg
		return nil
	}
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return nil, schedulerErrors.ErrSchedulerInternal
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.NoError(err, "permanent error should not be retried")
	s.NotEmpty(failedMsg)
}

func (s *ScheduleGenerationWorkerSuite) TestWork_Infeasible_MarksInfeasible() {
	args := s.newArgs()
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error { return nil }
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, _ string) error { return nil }

	var infeasibleCalled bool
	s.generationSvc.MarkInfeasibleFn = func(_ context.Context, _ uuid.UUID, _ string, _ string) error {
		infeasibleCalled = true
		return nil
	}
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return &types.GenerateScheduleResponse{
			Status:   types.ScheduleStatus_Infeasible,
			Metadata: types.GenerateScheduleMetadata{SolverStatusCode: 3},
		}, nil
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.NoError(err)
	s.True(infeasibleCalled)
}

func (s *ScheduleGenerationWorkerSuite) TestWork_InvalidDate_MarksFailed() {
	args := s.newArgs()
	args.EffectiveFrom = "not-a-date"
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error { return nil }
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return s.newResponse(), nil
	}

	var failedMsg string
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, msg string) error {
		failedMsg = msg
		return nil
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.NoError(err)
	s.Contains(failedMsg, "invalid effective_from")
}

func (s *ScheduleGenerationWorkerSuite) TestWork_CreateScheduleFails_MarksFailed() {
	args := s.newArgs()
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error { return nil }
	s.schedulerSvc.GenerateScheduleFn = func(_ types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
		return s.newResponse(), nil
	}
	s.scheduleRepo.CreateFn = func(_ context.Context, _ *sql.Tx, _ *aggregate.Schedule) (*aggregate.Schedule, error) {
		return nil, fmt.Errorf("db write error")
	}
	s.generationSvc.MarkCompletedFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) error { return nil }

	var failedCalled bool
	s.generationSvc.MarkFailedFn = func(_ context.Context, _ uuid.UUID, _ string) error {
		failedCalled = true
		return nil
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.NoError(err)
	s.True(failedCalled)
}

func (s *ScheduleGenerationWorkerSuite) TestWork_MarkStartedFails_StillProcesses() {
	args := s.newArgs()
	s.setupHappyPath(args)
	s.generationSvc.MarkStartedFn = func(_ context.Context, _ uuid.UUID) error {
		return fmt.Errorf("already started")
	}

	var completedCalled bool
	s.generationSvc.MarkCompletedFn = func(_ context.Context, _ uuid.UUID, _ uuid.UUID, _ string) error {
		completedCalled = true
		return nil
	}

	err := s.worker.Work(context.Background(), s.newJob(args))

	s.NoError(err)
	s.True(completedCalled, "should still complete even if MarkStarted fails on retry")
}

// ── Email Notification Worker ──────────────────────────────────────────

type EmailNotificationWorkerSuite struct {
	suite.Suite
	emailSender *mocks.MockEmailSender
	worker      *jobs.EmailNotificationWorker
}

func TestEmailNotificationWorkerSuite(t *testing.T) {
	suite.Run(t, new(EmailNotificationWorkerSuite))
}

func (s *EmailNotificationWorkerSuite) SetupTest() {
	s.emailSender = &mocks.MockEmailSender{}
	s.worker = jobs.NewEmailNotificationWorker(zap.NewNop(), s.emailSender)
}

func (s *EmailNotificationWorkerSuite) newJob(emails emailDtos.SendEmailBulkRequest) *river.Job[jobs.EmailNotificationArgs] {
	return &river.Job[jobs.EmailNotificationArgs]{
		Args: jobs.EmailNotificationArgs{
			ScheduleID: uuid.New(),
			Emails:     emails,
			BatchIndex: 0,
		},
	}
}

func (s *EmailNotificationWorkerSuite) TestWork_Success() {
	emails := emailDtos.SendEmailBulkRequest{
		{From: "noreply@test.com", To: []string{"a@test.com"}, Subject: "Test", HTML: "<p>Hi</p>"},
		{From: "noreply@test.com", To: []string{"b@test.com"}, Subject: "Test", HTML: "<p>Hi</p>"},
	}

	var sentCount int
	s.emailSender.SendBatchFn = func(_ context.Context, req emailDtos.SendEmailBulkRequest) (*emailDtos.SendEmailBulkResponse, error) {
		sentCount = len(req)
		return &emailDtos.SendEmailBulkResponse{}, nil
	}

	err := s.worker.Work(context.Background(), s.newJob(emails))

	s.NoError(err)
	s.Equal(2, sentCount)
}

func (s *EmailNotificationWorkerSuite) TestWork_SendFails_ReturnsError() {
	emails := emailDtos.SendEmailBulkRequest{
		{From: "noreply@test.com", To: []string{"a@test.com"}, Subject: "Test", HTML: "<p>Hi</p>"},
	}

	s.emailSender.SendBatchFn = func(_ context.Context, _ emailDtos.SendEmailBulkRequest) (*emailDtos.SendEmailBulkResponse, error) {
		return nil, fmt.Errorf("email service down")
	}

	err := s.worker.Work(context.Background(), s.newJob(emails))

	s.Error(err, "should return error so River retries")
	s.Contains(err.Error(), "email service down")
}

func (s *EmailNotificationWorkerSuite) TestWork_EmptyBatch_Success() {
	s.emailSender.SendBatchFn = func(_ context.Context, req emailDtos.SendEmailBulkRequest) (*emailDtos.SendEmailBulkResponse, error) {
		return &emailDtos.SendEmailBulkResponse{}, nil
	}

	err := s.worker.Work(context.Background(), s.newJob(emailDtos.SendEmailBulkRequest{}))

	s.NoError(err)
}

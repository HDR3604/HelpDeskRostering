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

type ScheduleGenerationServiceTestSuite struct {
	suite.Suite
	repo    *mocks.MockScheduleGenerationRepository
	service service.ScheduleGenerationServiceInterface
	authCtx context.Context
}

func TestScheduleGenerationServiceTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleGenerationServiceTestSuite))
}

func (s *ScheduleGenerationServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockScheduleGenerationRepository{}
	svc := service.NewScheduleGenerationService(zap.NewNop(), s.repo, &mocks.StubTxManager{})
	s.service = svc
	s.authCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID: uuid.New().String(),
		Role:   "admin",
	})
}

func (s *ScheduleGenerationServiceTestSuite) newGeneration() *aggregate.ScheduleGeneration {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), `{"assistants":[],"shifts":[]}`)
	gen.CreatedAt = time.Now()
	return gen
}

// --- Create (internal — InSystemTx, no auth needed) ---

func (s *ScheduleGenerationServiceTestSuite) TestCreate_Success() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, generation *aggregate.ScheduleGeneration) (*aggregate.ScheduleGeneration, error) {
		return generation, nil
	}

	result, err := s.service.Create(context.Background(), uuid.New(), uuid.New(), `{"test":true}`)

	s.Require().NoError(err)
	s.NotNil(result)
	s.Equal(aggregate.GenerationStatus_Pending, result.Status)
}

func (s *ScheduleGenerationServiceTestSuite) TestCreate_RepoError() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, _ *aggregate.ScheduleGeneration) (*aggregate.ScheduleGeneration, error) {
		return nil, context.DeadlineExceeded
	}

	result, err := s.service.Create(context.Background(), uuid.New(), uuid.New(), "{}")

	s.Error(err)
	s.Nil(result)
}

// --- MarkStarted (internal — InSystemTx) ---

func (s *ScheduleGenerationServiceTestSuite) TestMarkStarted_Success() {
	gen := s.newGeneration()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		s.Equal(gen.ID, id)
		return gen, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.ScheduleGeneration) error {
		s.NotNil(updated.StartedAt)
		return nil
	}

	err := s.service.MarkStarted(context.Background(), gen.ID)

	s.NoError(err)
}

func (s *ScheduleGenerationServiceTestSuite) TestMarkStarted_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrGenerationNotFound
	}

	err := s.service.MarkStarted(context.Background(), uuid.New())

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotFound)
}

func (s *ScheduleGenerationServiceTestSuite) TestMarkStarted_NotPending() {
	gen := s.newGeneration()
	gen.Status = aggregate.GenerationStatus_Completed

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	err := s.service.MarkStarted(context.Background(), gen.ID)

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotPending)
}

// --- MarkCompleted (internal — InSystemTx) ---

func (s *ScheduleGenerationServiceTestSuite) TestMarkCompleted_Success() {
	gen := s.newGeneration()
	now := time.Now()
	gen.StartedAt = &now

	scheduleID := uuid.New()
	responsePayload := `{"assignments":[]}`

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.ScheduleGeneration) error {
		s.Equal(aggregate.GenerationStatus_Completed, updated.Status)
		s.Require().NotNil(updated.ScheduleID)
		s.Equal(scheduleID, *updated.ScheduleID)
		s.Require().NotNil(updated.ResponsePayload)
		s.Equal(responsePayload, *updated.ResponsePayload)
		s.NotNil(updated.CompletedAt)
		return nil
	}

	err := s.service.MarkCompleted(context.Background(), gen.ID, scheduleID, responsePayload)

	s.NoError(err)
}

func (s *ScheduleGenerationServiceTestSuite) TestMarkCompleted_NotStarted() {
	gen := s.newGeneration()

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	err := s.service.MarkCompleted(context.Background(), gen.ID, uuid.New(), "{}")

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotStarted)
}

// --- MarkFailed (internal — InSystemTx) ---

func (s *ScheduleGenerationServiceTestSuite) TestMarkFailed_Success() {
	gen := s.newGeneration()
	now := time.Now()
	gen.StartedAt = &now

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.ScheduleGeneration) error {
		s.Equal(aggregate.GenerationStatus_Failed, updated.Status)
		s.Require().NotNil(updated.ErrorMessage)
		s.Equal("solver timed out", *updated.ErrorMessage)
		s.NotNil(updated.CompletedAt)
		return nil
	}

	err := s.service.MarkFailed(context.Background(), gen.ID, "solver timed out")

	s.NoError(err)
}

func (s *ScheduleGenerationServiceTestSuite) TestMarkFailed_NotStarted() {
	gen := s.newGeneration()

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	err := s.service.MarkFailed(context.Background(), gen.ID, "error")

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotStarted)
}

// --- MarkInfeasible (internal — InSystemTx) ---

func (s *ScheduleGenerationServiceTestSuite) TestMarkInfeasible_Success() {
	gen := s.newGeneration()
	now := time.Now()
	gen.StartedAt = &now

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.ScheduleGeneration) error {
		s.Equal(aggregate.GenerationStatus_Infeasible, updated.Status)
		s.Require().NotNil(updated.ResponsePayload)
		s.Equal(`{"partial":"result"}`, *updated.ResponsePayload)
		s.Require().NotNil(updated.ErrorMessage)
		s.Equal("no feasible solution", *updated.ErrorMessage)
		s.NotNil(updated.CompletedAt)
		return nil
	}

	err := s.service.MarkInfeasible(context.Background(), gen.ID, `{"partial":"result"}`, "no feasible solution")

	s.NoError(err)
}

func (s *ScheduleGenerationServiceTestSuite) TestMarkInfeasible_NotStarted() {
	gen := s.newGeneration()

	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	err := s.service.MarkInfeasible(context.Background(), gen.ID, "{}", "infeasible")

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotStarted)
}

// --- GetByID (external — InAuthTx, requires auth) ---

func (s *ScheduleGenerationServiceTestSuite) TestGetByID_Success() {
	expected := s.newGeneration()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	result, err := s.service.GetByID(s.authCtx, expected.ID)

	s.Require().NoError(err)
	s.Equal(expected.ID, result.ID)
}

func (s *ScheduleGenerationServiceTestSuite) TestGetByID_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrGenerationNotFound
	}

	result, err := s.service.GetByID(s.authCtx, uuid.New())

	s.Error(err)
	s.Nil(result)
}

func (s *ScheduleGenerationServiceTestSuite) TestGetByID_MissingAuthContext() {
	result, err := s.service.GetByID(context.Background(), uuid.New())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- List (external — InAuthTx, requires auth) ---

func (s *ScheduleGenerationServiceTestSuite) TestList_Success() {
	expected := []*aggregate.ScheduleGeneration{s.newGeneration(), s.newGeneration()}
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.ScheduleGeneration, error) {
		return expected, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Len(result, 2)
}

func (s *ScheduleGenerationServiceTestSuite) TestList_MissingAuthContext() {
	result, err := s.service.List(context.Background())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

func (s *ScheduleGenerationServiceTestSuite) TestList_Empty() {
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.ScheduleGeneration, error) {
		return []*aggregate.ScheduleGeneration{}, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Empty(result)
}

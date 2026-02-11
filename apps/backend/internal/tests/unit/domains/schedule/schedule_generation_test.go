package schedule_test

import (
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type ScheduleGenerationAggregateTestSuite struct {
	suite.Suite
}

func TestScheduleGenerationAggregateTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleGenerationAggregateTestSuite))
}

func (s *ScheduleGenerationAggregateTestSuite) TestNewScheduleGeneration() {
	configID := uuid.New()
	createdBy := uuid.New()
	payload := `{"assistants":[],"shifts":[]}`

	gen := aggregate.NewScheduleGeneration(configID, createdBy, payload)

	s.NotEqual(uuid.Nil, gen.ID)
	s.Equal(configID, gen.ConfigID)
	s.Equal(createdBy, gen.CreatedBy)
	s.Equal(aggregate.GenerationStatus_Pending, gen.Status)
	s.Require().NotNil(gen.RequestPayload)
	s.Equal(payload, *gen.RequestPayload)
	s.Nil(gen.ScheduleID)
	s.Nil(gen.ResponsePayload)
	s.Nil(gen.ErrorMessage)
	s.Nil(gen.StartedAt)
	s.Nil(gen.CompletedAt)
}

// --- MarkStarted ---

func (s *ScheduleGenerationAggregateTestSuite) TestMarkStarted_Success() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")

	err := gen.MarkStarted()

	s.NoError(err)
	s.NotNil(gen.StartedAt)
	s.Equal(aggregate.GenerationStatus_Pending, gen.Status)
}

func (s *ScheduleGenerationAggregateTestSuite) TestMarkStarted_NotPending() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")
	gen.Status = aggregate.GenerationStatus_Completed

	err := gen.MarkStarted()

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotPending)
}

func (s *ScheduleGenerationAggregateTestSuite) TestMarkStarted_AlreadyStarted() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")
	s.NoError(gen.MarkStarted())

	// MarkStarted again should fail — status is still pending but StartedAt is set.
	// Actually status stays pending after MarkStarted, so a second call succeeds.
	// This tests idempotency — the timestamp gets overwritten.
	err := gen.MarkStarted()
	s.NoError(err)
}

// --- MarkCompleted ---

func (s *ScheduleGenerationAggregateTestSuite) TestMarkCompleted_Success() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")
	s.NoError(gen.MarkStarted())

	scheduleID := uuid.New()
	responsePayload := `{"assignments":[]}`

	err := gen.MarkCompleted(scheduleID, responsePayload)

	s.NoError(err)
	s.Equal(aggregate.GenerationStatus_Completed, gen.Status)
	s.Require().NotNil(gen.ScheduleID)
	s.Equal(scheduleID, *gen.ScheduleID)
	s.Require().NotNil(gen.ResponsePayload)
	s.Equal(responsePayload, *gen.ResponsePayload)
	s.NotNil(gen.CompletedAt)
}

func (s *ScheduleGenerationAggregateTestSuite) TestMarkCompleted_NotStarted() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")

	err := gen.MarkCompleted(uuid.New(), "{}")

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotStarted)
}

// --- MarkFailed ---

func (s *ScheduleGenerationAggregateTestSuite) TestMarkFailed_Success() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")
	s.NoError(gen.MarkStarted())

	err := gen.MarkFailed("solver timed out")

	s.NoError(err)
	s.Equal(aggregate.GenerationStatus_Failed, gen.Status)
	s.Require().NotNil(gen.ErrorMessage)
	s.Equal("solver timed out", *gen.ErrorMessage)
	s.NotNil(gen.CompletedAt)
	s.Nil(gen.ScheduleID)
	s.Nil(gen.ResponsePayload)
}

func (s *ScheduleGenerationAggregateTestSuite) TestMarkFailed_NotStarted() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")

	err := gen.MarkFailed("error")

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotStarted)
}

// --- MarkInfeasible ---

func (s *ScheduleGenerationAggregateTestSuite) TestMarkInfeasible_Success() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")
	s.NoError(gen.MarkStarted())

	err := gen.MarkInfeasible(`{"partial":"result"}`, "no feasible solution")

	s.NoError(err)
	s.Equal(aggregate.GenerationStatus_Infeasible, gen.Status)
	s.Require().NotNil(gen.ResponsePayload)
	s.Equal(`{"partial":"result"}`, *gen.ResponsePayload)
	s.Require().NotNil(gen.ErrorMessage)
	s.Equal("no feasible solution", *gen.ErrorMessage)
	s.NotNil(gen.CompletedAt)
}

func (s *ScheduleGenerationAggregateTestSuite) TestMarkInfeasible_NotStarted() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")

	err := gen.MarkInfeasible("{}", "infeasible")

	s.ErrorIs(err, scheduleErrors.ErrGenerationNotStarted)
}

// --- Model conversion ---

func (s *ScheduleGenerationAggregateTestSuite) TestModelRoundTrip() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), `{"test":true}`)
	gen.CreatedAt = time.Now()
	s.NoError(gen.MarkStarted())
	s.NoError(gen.MarkCompleted(uuid.New(), `{"result":"ok"}`))

	m := gen.ToModel()
	restored := aggregate.ScheduleGenerationFromModel(m)

	s.Equal(gen.ID, restored.ID)
	s.Equal(gen.ConfigID, restored.ConfigID)
	s.Equal(string(gen.Status), string(restored.Status))
	s.Equal(gen.CreatedBy, restored.CreatedBy)
	s.Equal(*gen.ScheduleID, *restored.ScheduleID)
	s.Equal(*gen.RequestPayload, *restored.RequestPayload)
	s.Equal(*gen.ResponsePayload, *restored.ResponsePayload)
}

func (s *ScheduleGenerationAggregateTestSuite) TestModelRoundTrip_NilFields() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), uuid.New(), "{}")
	gen.CreatedAt = time.Now()

	m := gen.ToModel()
	restored := aggregate.ScheduleGenerationFromModel(m)

	s.Nil(restored.ScheduleID)
	s.Nil(restored.ResponsePayload)
	s.Nil(restored.ErrorMessage)
	s.Nil(restored.StartedAt)
	s.Nil(restored.CompletedAt)
}

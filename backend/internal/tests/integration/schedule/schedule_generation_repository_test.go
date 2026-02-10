package schedule_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	scheduleRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/schedule"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type ScheduleGenerationRepositoryTestSuite struct {
	suite.Suite
	testDB       *utils.TestDB
	txManager    database.TxManagerInterface
	genRepo      *scheduleRepo.ScheduleGenerationRepository
	scheduleRepo *scheduleRepo.ScheduleRepository
	ctx          context.Context
	userID       uuid.UUID
	configID     uuid.UUID
}

func TestScheduleGenerationRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleGenerationRepositoryTestSuite))
}

func (s *ScheduleGenerationRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.genRepo = scheduleRepo.NewScheduleGenerationRepository(s.testDB.Logger).(*scheduleRepo.ScheduleGenerationRepository)
	s.scheduleRepo = scheduleRepo.NewScheduleRepository(s.testDB.Logger).(*scheduleRepo.ScheduleRepository)
	s.ctx = context.Background()

	// Default scheduler config seeded by migration 000003
	s.configID = uuid.MustParse("00000000-0000-0000-0000-000000000001")

	// Seed a user for the created_by FK
	s.userID = uuid.New()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			s.userID, "generation-test@test.com", "hashed", "admin",
		)
		return err
	})
	s.Require().NoError(err)
}

func (s *ScheduleGenerationRepositoryTestSuite) TearDownTest() {
	s.testDB.Truncate(s.T(), "schedule.schedule_generations", "schedule.schedules")
}

// --- helpers ---

func (s *ScheduleGenerationRepositoryTestSuite) createGeneration(requestPayload string) *aggregate.ScheduleGeneration {
	gen := aggregate.NewScheduleGeneration(s.configID, s.userID, requestPayload)

	var result *aggregate.ScheduleGeneration
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.Create(s.ctx, tx, gen)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

func (s *ScheduleGenerationRepositoryTestSuite) createSchedule() *aggregate.Schedule {
	schedule := &aggregate.Schedule{
		ScheduleID:           uuid.New(),
		Title:                "Test Schedule",
		Assignments:          json.RawMessage("{}"),
		AvailabilityMetadata: json.RawMessage("{}"),
		CreatedBy:            s.userID,
		EffectiveFrom:        time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
	}

	var result *aggregate.Schedule
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.scheduleRepo.Create(s.ctx, tx, schedule)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

// --- Create ---

func (s *ScheduleGenerationRepositoryTestSuite) TestCreate_Success() {
	payload := `{"assistants":[],"shifts":[]}`
	result := s.createGeneration(payload)

	s.NotEqual(uuid.Nil, result.ID)
	s.Equal(s.configID, result.ConfigID)
	s.Equal(s.userID, result.CreatedBy)
	s.Equal(aggregate.GenerationStatus_Pending, result.Status)
	s.Require().NotNil(result.RequestPayload)
	s.JSONEq(payload, *result.RequestPayload)
	s.Nil(result.ScheduleID)
	s.Nil(result.ResponsePayload)
	s.Nil(result.ErrorMessage)
	s.Nil(result.StartedAt)
	s.Nil(result.CompletedAt)
	s.NotZero(result.CreatedAt)
}

func (s *ScheduleGenerationRepositoryTestSuite) TestCreate_InvalidConfigFK() {
	gen := aggregate.NewScheduleGeneration(uuid.New(), s.userID, "{}")

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := s.genRepo.Create(s.ctx, tx, gen)
		return err
	})

	s.Require().Error(err)
	s.Contains(err.Error(), "fk_schedule_generations_config")
}

// --- GetByID ---

func (s *ScheduleGenerationRepositoryTestSuite) TestGetByID_Success() {
	created := s.createGeneration(`{"shifts":[]}`)

	var result *aggregate.ScheduleGeneration
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.GetByID(s.ctx, tx, created.ID)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
	s.Equal(created.ConfigID, result.ConfigID)
	s.Equal(aggregate.GenerationStatus_Pending, result.Status)
}

func (s *ScheduleGenerationRepositoryTestSuite) TestGetByID_NotFound() {
	var result *aggregate.ScheduleGeneration
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.GetByID(s.ctx, tx, uuid.New())
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrGenerationNotFound)
	s.Nil(result)
}

// --- List ---

func (s *ScheduleGenerationRepositoryTestSuite) TestList_Success() {
	s.createGeneration(`{"run":1}`)
	s.createGeneration(`{"run":2}`)

	var results []*aggregate.ScheduleGeneration
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		results, txErr = s.genRepo.List(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Len(results, 2)
	// Ordered by created_at DESC — most recent first
	s.True(results[0].CreatedAt.After(results[1].CreatedAt) || results[0].CreatedAt.Equal(results[1].CreatedAt))
}

func (s *ScheduleGenerationRepositoryTestSuite) TestList_Empty() {
	var results []*aggregate.ScheduleGeneration
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		results, txErr = s.genRepo.List(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Empty(results)
}

// --- Update: status transitions ---

func (s *ScheduleGenerationRepositoryTestSuite) TestUpdate_MarkStarted() {
	gen := s.createGeneration(`{}`)
	s.Require().NoError(gen.MarkStarted())

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Verify persisted
	var result *aggregate.ScheduleGeneration
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.GetByID(s.ctx, tx, gen.ID)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result.StartedAt)
	s.Equal(aggregate.GenerationStatus_Pending, result.Status) // MarkStarted doesn't change status
}

func (s *ScheduleGenerationRepositoryTestSuite) TestUpdate_MarkCompleted() {
	gen := s.createGeneration(`{}`)
	s.Require().NoError(gen.MarkStarted())

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Create a schedule to link to
	schedule := s.createSchedule()

	responsePayload := `{"status":"Optimal","assignments":[]}`
	s.Require().NoError(gen.MarkCompleted(schedule.ScheduleID, responsePayload))

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Verify persisted
	var result *aggregate.ScheduleGeneration
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.GetByID(s.ctx, tx, gen.ID)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(aggregate.GenerationStatus_Completed, result.Status)
	s.Require().NotNil(result.ScheduleID)
	s.Equal(schedule.ScheduleID, *result.ScheduleID)
	s.Require().NotNil(result.ResponsePayload)
	s.JSONEq(responsePayload, *result.ResponsePayload)
	s.NotNil(result.CompletedAt)
}

func (s *ScheduleGenerationRepositoryTestSuite) TestUpdate_MarkFailed() {
	gen := s.createGeneration(`{}`)
	s.Require().NoError(gen.MarkStarted())

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	s.Require().NoError(gen.MarkFailed("scheduler service is not available"))

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Verify persisted
	var result *aggregate.ScheduleGeneration
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.GetByID(s.ctx, tx, gen.ID)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(aggregate.GenerationStatus_Failed, result.Status)
	s.Nil(result.ScheduleID)
	s.Require().NotNil(result.ErrorMessage)
	s.Equal("scheduler service is not available", *result.ErrorMessage)
	s.NotNil(result.CompletedAt)
}

func (s *ScheduleGenerationRepositoryTestSuite) TestUpdate_MarkInfeasible() {
	gen := s.createGeneration(`{}`)
	s.Require().NoError(gen.MarkStarted())

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	responsePayload := `{"status":"Infeasible"}`
	s.Require().NoError(gen.MarkInfeasible(responsePayload, "no feasible schedule found"))

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Verify persisted
	var result *aggregate.ScheduleGeneration
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.genRepo.GetByID(s.ctx, tx, gen.ID)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(aggregate.GenerationStatus_Infeasible, result.Status)
	s.Require().NotNil(result.ResponsePayload)
	s.JSONEq(responsePayload, *result.ResponsePayload)
	s.Require().NotNil(result.ErrorMessage)
	s.Equal("no feasible schedule found", *result.ErrorMessage)
	s.NotNil(result.CompletedAt)
}

func (s *ScheduleGenerationRepositoryTestSuite) TestUpdate_NotFound() {
	gen := &aggregate.ScheduleGeneration{
		ID:       uuid.New(),
		ConfigID: s.configID,
		Status:   aggregate.GenerationStatus_Pending,
	}

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrGenerationNotFound)
}

// --- Schedule ↔ Generation FK link ---

func (s *ScheduleGenerationRepositoryTestSuite) TestScheduleWithGenerationID() {
	// Create a generation
	gen := s.createGeneration(`{"assistants":[],"shifts":[]}`)
	s.Require().NoError(gen.MarkStarted())
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Create a schedule linked to the generation
	metadata := `{"objective_value":1.5}`
	schedule := &aggregate.Schedule{
		ScheduleID:           uuid.New(),
		Title:                "Generated Schedule",
		Assignments:          json.RawMessage(`[{"assistant_id":"a1","shift_id":"s1"}]`),
		AvailabilityMetadata: json.RawMessage("{}"),
		CreatedBy:            s.userID,
		EffectiveFrom:        time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
		GenerationID:         &gen.ID,
		SchedulerMetadata:    &metadata,
	}

	var created *aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		created, txErr = s.scheduleRepo.Create(s.ctx, tx, schedule)
		return txErr
	})
	s.Require().NoError(err)

	// Verify generation_id and scheduler_metadata were persisted
	var fetched *aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		fetched, txErr = s.scheduleRepo.GetByID(s.ctx, tx, created.ScheduleID)
		return txErr
	})
	s.Require().NoError(err)
	s.Require().NotNil(fetched.GenerationID)
	s.Equal(gen.ID, *fetched.GenerationID)
	s.Require().NotNil(fetched.SchedulerMetadata)
	s.JSONEq(metadata, *fetched.SchedulerMetadata)

	// Verify assignments persisted correctly
	var assignments []map[string]any
	s.Require().NoError(json.Unmarshal(fetched.Assignments, &assignments))
	s.Len(assignments, 1)
	s.Equal("a1", assignments[0]["assistant_id"])

	// Complete the generation with the schedule link
	responsePayload := `{"status":"Optimal"}`
	s.Require().NoError(gen.MarkCompleted(created.ScheduleID, responsePayload))
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.genRepo.Update(s.ctx, tx, gen)
	})
	s.Require().NoError(err)

	// Verify bidirectional FK: generation → schedule
	var fetchedGen *aggregate.ScheduleGeneration
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		fetchedGen, txErr = s.genRepo.GetByID(s.ctx, tx, gen.ID)
		return txErr
	})
	s.Require().NoError(err)
	s.Require().NotNil(fetchedGen.ScheduleID)
	s.Equal(created.ScheduleID, *fetchedGen.ScheduleID)
}

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

type ScheduleRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      *scheduleRepo.ScheduleRepository
	ctx       context.Context
	userID    uuid.UUID
}

func TestScheduleRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleRepositoryTestSuite))
}

func (s *ScheduleRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = scheduleRepo.NewScheduleRepository(s.testDB.Logger).(*scheduleRepo.ScheduleRepository)
	s.ctx = context.Background()

	// Seed a user for the created_by FK
	s.userID = uuid.New()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			s.userID, "schedule-test@test.com", "hashed", "admin",
		)
		return err
	})
	s.Require().NoError(err)
}

func (s *ScheduleRepositoryTestSuite) TearDownTest() {
	s.testDB.Truncate(s.T(), "schedule.schedules")
}

// --- helpers ---

func (s *ScheduleRepositoryTestSuite) createSchedule(title string, effectiveFrom time.Time, effectiveTo *time.Time) *aggregate.Schedule {
	schedule := &aggregate.Schedule{
		ScheduleID:    uuid.New(),
		Title:         title,
		CreatedBy:     s.userID,
		EffectiveFrom: effectiveFrom,
		EffectiveTo:   effectiveTo,
	}

	var result *aggregate.Schedule
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, schedule)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

// --- Create ---

func (s *ScheduleRepositoryTestSuite) TestCreate_Success() {
	effectiveTo := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)
	result := s.createSchedule("Fall 2025", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), &effectiveTo)

	s.Equal("Fall 2025", result.Title)
	s.Equal(s.userID, result.CreatedBy)
	s.False(result.IsActive)
	s.NotZero(result.CreatedAt)
	s.Equal("2025-09-01", result.EffectiveFrom.Format("2006-01-02"))
	s.Require().NotNil(result.EffectiveTo)
	s.Equal("2025-12-31", result.EffectiveTo.Format("2006-01-02"))
}

func (s *ScheduleRepositoryTestSuite) TestCreate_NilEffectiveTo() {
	result := s.createSchedule("Open-ended", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)

	s.Equal("Open-ended", result.Title)
	s.Nil(result.EffectiveTo)
}

// --- GetByID ---

func (s *ScheduleRepositoryTestSuite) TestGetByID_Success() {
	created := s.createSchedule("Lookup", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)

	var result *aggregate.Schedule
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, created.ScheduleID)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ScheduleID, result.ScheduleID)
	s.Equal("Lookup", result.Title)
}

func (s *ScheduleRepositoryTestSuite) TestGetByID_NotFound() {
	var result *aggregate.Schedule
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, uuid.New())
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrNotFound)
	s.Nil(result)
}

// --- List ---

func (s *ScheduleRepositoryTestSuite) TestList_ReturnsNonArchived() {
	s.createSchedule("Active 1", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)
	s.createSchedule("Active 2", time.Date(2025, 10, 1, 0, 0, 0, 0, time.UTC), nil)

	// Archive one
	archived := s.createSchedule("Archived", time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), nil)
	archived.Archive()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, archived)
	})
	s.Require().NoError(err)

	var results []*aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		results, txErr = s.repo.List(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Len(results, 2)
	for _, r := range results {
		s.Nil(r.ArchivedAt)
	}
}

func (s *ScheduleRepositoryTestSuite) TestList_Empty() {
	var results []*aggregate.Schedule
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		results, txErr = s.repo.List(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Empty(results)
}

// --- ListArchived ---

func (s *ScheduleRepositoryTestSuite) TestListArchived_ReturnsOnlyArchived() {
	s.createSchedule("Not Archived", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)

	archived := s.createSchedule("Archived", time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC), nil)
	archived.Archive()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, archived)
	})
	s.Require().NoError(err)

	var results []*aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		results, txErr = s.repo.ListArchived(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Len(results, 1)
	s.Equal("Archived", results[0].Title)
	s.NotNil(results[0].ArchivedAt)
}

// --- GetActive ---

func (s *ScheduleRepositoryTestSuite) TestGetActive_Success() {
	created := s.createSchedule("Active Schedule", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)
	created.Activate()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, created)
	})
	s.Require().NoError(err)

	var result *aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetActive(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.True(result.IsActive)
	s.Equal("Active Schedule", result.Title)
}

func (s *ScheduleRepositoryTestSuite) TestGetActive_NotFound() {
	s.createSchedule("Inactive", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)

	var result *aggregate.Schedule
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetActive(s.ctx, tx)
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrNotFound)
	s.Nil(result)
}

// --- Update ---

func (s *ScheduleRepositoryTestSuite) TestUpdate_Success() {
	created := s.createSchedule("Original", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)
	created.Title = "Updated Title"
	created.Activate()

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, created)
	})
	s.Require().NoError(err)

	// Verify the update persisted
	var result *aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, created.ScheduleID)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal("Updated Title", result.Title)
	s.True(result.IsActive)
	s.NotNil(result.UpdatedAt)
}

func (s *ScheduleRepositoryTestSuite) TestUpdate_NotFound() {
	nonExistent := &aggregate.Schedule{
		ScheduleID:           uuid.New(),
		Title:                "Ghost",
		CreatedBy:            s.userID,
		Assignments:          json.RawMessage(`{}`),
		AvailabilityMetadata: json.RawMessage(`{}`),
		EffectiveFrom:        time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
	}

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, nonExistent)
	})

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrNotFound)
}

func (s *ScheduleRepositoryTestSuite) TestUpdate_ArchiveSetsTimestamp() {
	created := s.createSchedule("To Archive", time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC), nil)
	created.Archive()

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, created)
	})
	s.Require().NoError(err)

	var result *aggregate.Schedule
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, created.ScheduleID)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result.ArchivedAt)
	s.False(result.IsActive)
}

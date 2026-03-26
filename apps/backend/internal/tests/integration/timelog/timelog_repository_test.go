package timelog_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	timelogRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/timelog"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type TimeLogRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      repository.TimeLogRepositoryInterface
	ctx       context.Context
	userID    uuid.UUID
	studentID int32
}

func TestTimeLogRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(TimeLogRepositoryTestSuite))
}

func (s *TimeLogRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = timelogRepo.NewTimeLogRepository(s.testDB.Logger)
	s.ctx = context.Background()

	// Seed a user + student for FK constraints
	s.userID = uuid.New()
	s.studentID = 10001
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			s.userID, "timelog-test@test.com", "hashed", "student",
		)
		if err != nil {
			return err
		}
		_, err = tx.ExecContext(s.ctx,
			`INSERT INTO auth.students (student_id, email_address, first_name, last_name, phone_number, transcript_metadata, availability)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			s.studentID, "timelog-test@test.com", "Test", "Student", "+18681234567", `{}`, `{}`,
		)
		return err
	})
	s.Require().NoError(err)
}

func (s *TimeLogRepositoryTestSuite) TearDownTest() {
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, "TRUNCATE TABLE schedule.time_logs CASCADE")
		return err
	})
	s.Require().NoError(err)
}

// --- helpers ---

func (s *TimeLogRepositoryTestSuite) createTimeLog(studentID int32, lon, lat, dist float64) *aggregate.TimeLog {
	tl, err := aggregate.NewTimeLog(studentID, lon, lat, dist)
	s.Require().NoError(err)

	var result *aggregate.TimeLog
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, tl)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

func (s *TimeLogRepositoryTestSuite) studentAuthCtx() database.AuthContext {
	sid := "10001"
	return database.AuthContext{
		UserID:    s.userID.String(),
		StudentID: &sid,
		Role:      "student",
	}
}

// --- Create ---

func (s *TimeLogRepositoryTestSuite) TestCreate_Success() {
	result := s.createTimeLog(s.studentID, -61.277001, 10.642707, 15.3)

	s.Equal(s.studentID, result.StudentID)
	s.Equal(-61.277001, result.Longitude)
	s.Equal(10.642707, result.Latitude)
	s.InDelta(15.3, result.DistanceMeters, 0.01)
	s.False(result.IsFlagged)
	s.Nil(result.ExitAt)
	s.NotZero(result.CreatedAt)
}

// --- GetByID ---

func (s *TimeLogRepositoryTestSuite) TestGetByID_Success() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)

	var result *aggregate.TimeLog
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, created.ID)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
	s.Equal(s.studentID, result.StudentID)
}

func (s *TimeLogRepositoryTestSuite) TestGetByID_NotFound() {
	var result *aggregate.TimeLog
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, uuid.New())
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

// --- GetOpenByStudentID ---

func (s *TimeLogRepositoryTestSuite) TestGetOpenByStudentID_Success() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)

	var result *aggregate.TimeLog
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetOpenByStudentID(s.ctx, tx, s.studentID)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
	s.Nil(result.ExitAt)
}

func (s *TimeLogRepositoryTestSuite) TestGetOpenByStudentID_NotFound() {
	var result *aggregate.TimeLog
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetOpenByStudentID(s.ctx, tx, s.studentID)
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

func (s *TimeLogRepositoryTestSuite) TestGetOpenByStudentID_IgnoresClosed() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)

	// Clock out
	err := created.ClockOut(time.Now().UTC())
	s.Require().NoError(err)
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, txErr := s.repo.Update(s.ctx, tx, created)
		return txErr
	})
	s.Require().NoError(err)

	// Should not find the closed log
	var result *aggregate.TimeLog
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetOpenByStudentID(s.ctx, tx, s.studentID)
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

// --- Update (ClockOut) ---

func (s *TimeLogRepositoryTestSuite) TestUpdate_ClockOut() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)

	err := created.ClockOut(time.Now().UTC())
	s.Require().NoError(err)

	var result *aggregate.TimeLog
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Update(s.ctx, tx, created)
		return txErr
	})

	s.Require().NoError(err)
	s.NotNil(result.ExitAt)
}

func (s *TimeLogRepositoryTestSuite) TestUpdate_Flag() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 500.0)

	err := created.Flag("too far from help desk")
	s.Require().NoError(err)

	var result *aggregate.TimeLog
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Update(s.ctx, tx, created)
		return txErr
	})

	s.Require().NoError(err)
	s.True(result.IsFlagged)
	s.Require().NotNil(result.FlagReason)
	s.Equal("too far from help desk", *result.FlagReason)
}

// --- List ---

func (s *TimeLogRepositoryTestSuite) TestList_Success() {
	first := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)
	// Close the first log so we can create a second (unique index)
	_ = first.ClockOut(time.Now().UTC())
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, txErr := s.repo.Update(s.ctx, tx, first)
		return txErr
	})
	s.Require().NoError(err)
	s.createTimeLog(s.studentID, -61.278, 10.643, 20.0)

	sid := s.studentID
	var logs []*aggregate.TimeLog
	var total int
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		logs, total, txErr = s.repo.List(s.ctx, tx, repository.TimeLogFilter{
			StudentID: &sid,
			Page:      1,
			PerPage:   20,
		})
		return txErr
	})

	s.Require().NoError(err)
	s.Len(logs, 2)
	s.Equal(2, total)
}

func (s *TimeLogRepositoryTestSuite) TestList_Empty() {
	sid := s.studentID
	var logs []*aggregate.TimeLog
	var total int
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		logs, total, txErr = s.repo.List(s.ctx, tx, repository.TimeLogFilter{
			StudentID: &sid,
			Page:      1,
			PerPage:   20,
		})
		return txErr
	})

	s.Require().NoError(err)
	s.Empty(logs)
	s.Equal(0, total)
}

// --- Unique partial index ---

func (s *TimeLogRepositoryTestSuite) TestCreate_DuplicateOpenLog_Rejected() {
	// First open log succeeds
	s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)

	// Second open log should be rejected by the partial unique index
	tl, err := aggregate.NewTimeLog(s.studentID, -61.278, 10.643, 20.0)
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, txErr := s.repo.Create(s.ctx, tx, tl)
		return txErr
	})

	s.Require().Error(err, "should reject duplicate open time log for same student")
}

// --- RLS: student can only see own rows ---

func (s *TimeLogRepositoryTestSuite) TestRLS_StudentCanReadOwnLogs() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)

	authCtx := s.studentAuthCtx()
	var result *aggregate.TimeLog
	err := s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, created.ID)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
}

func (s *TimeLogRepositoryTestSuite) TestRLS_StudentCanInsertOwnLog() {
	tl, err := aggregate.NewTimeLog(s.studentID, -61.277, 10.642, 10.0)
	s.Require().NoError(err)

	authCtx := s.studentAuthCtx()
	var result *aggregate.TimeLog
	err = s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, tl)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(s.studentID, result.StudentID)
}

func (s *TimeLogRepositoryTestSuite) TestRLS_StudentCanUpdateOwnLog() {
	created := s.createTimeLog(s.studentID, -61.277, 10.642, 10.0)
	err := created.ClockOut(time.Now().UTC())
	s.Require().NoError(err)

	authCtx := s.studentAuthCtx()
	var result *aggregate.TimeLog
	err = s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Update(s.ctx, tx, created)
		return txErr
	})

	s.Require().NoError(err)
	s.NotNil(result.ExitAt)
}

func (s *TimeLogRepositoryTestSuite) TestRLS_StudentCannotSeeOtherStudentLogs() {
	// Seed a second student
	var otherStudentID int32 = 10002
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.students (student_id, email_address, first_name, last_name, phone_number, transcript_metadata, availability)
			 VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
			otherStudentID, "other-student@test.com", "Other", "Student", "+18681234568", `{}`, `{}`,
		)
		return err
	})
	s.Require().NoError(err)

	// Create a log for the other student via system tx
	otherLog := s.createTimeLog(otherStudentID, -61.277, 10.642, 10.0)

	// Try to read it as the first student — should fail (RLS)
	authCtx := s.studentAuthCtx()
	var result *aggregate.TimeLog
	err = s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, otherLog.ID)
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

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

type ClockInCodeRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      repository.ClockInCodeRepositoryInterface
	ctx       context.Context
	adminID   uuid.UUID
}

func TestClockInCodeRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(ClockInCodeRepositoryTestSuite))
}

func (s *ClockInCodeRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = timelogRepo.NewClockInCodeRepository(s.testDB.Logger)
	s.ctx = context.Background()

	// Seed an admin user for the created_by FK
	s.adminID = uuid.New()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			s.adminID, "clockincode-admin@test.com", "hashed", "admin",
		)
		return err
	})
	s.Require().NoError(err)
}

func (s *ClockInCodeRepositoryTestSuite) TearDownTest() {
	// Use InSystemTx to truncate because FORCE ROW LEVEL SECURITY
	// prevents the default DB role from truncating directly.
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, "TRUNCATE TABLE schedule.clock_in_codes CASCADE")
		return err
	})
	s.Require().NoError(err)
}

// --- helpers ---

func (s *ClockInCodeRepositoryTestSuite) createCode(expiresInMinutes int) *aggregate.ClockInCode {
	code, err := aggregate.NewClockInCode(s.adminID, expiresInMinutes)
	s.Require().NoError(err)

	var result *aggregate.ClockInCode
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, code)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

func (s *ClockInCodeRepositoryTestSuite) createExpiredCode() *aggregate.ClockInCode {
	code, err := aggregate.NewClockInCode(s.adminID, 1)
	s.Require().NoError(err)
	// Force expiration in the past
	code.ExpiresAt = time.Now().UTC().Add(-10 * time.Minute)

	var result *aggregate.ClockInCode
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, code)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

// --- Create ---

func (s *ClockInCodeRepositoryTestSuite) TestCreate_Success() {
	result := s.createCode(60)

	s.Len(result.Code, 8)
	s.Equal(s.adminID, result.CreatedBy)
	s.NotZero(result.CreatedAt)
	s.True(result.ExpiresAt.After(time.Now().UTC()))
}

// --- GetByCode ---

func (s *ClockInCodeRepositoryTestSuite) TestGetByCode_Success() {
	created := s.createCode(60)

	var result *aggregate.ClockInCode
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByCode(s.ctx, tx, created.Code)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
	s.Equal(created.Code, result.Code)
}

func (s *ClockInCodeRepositoryTestSuite) TestGetByCode_NotFound() {
	var result *aggregate.ClockInCode
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByCode(s.ctx, tx, "NOTEXIST")
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrInvalidClockInCode)
	s.Nil(result)
}

func (s *ClockInCodeRepositoryTestSuite) TestGetByCode_ExpiredNotReturned() {
	expired := s.createExpiredCode()

	var result *aggregate.ClockInCode
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByCode(s.ctx, tx, expired.Code)
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrInvalidClockInCode)
	s.Nil(result)
}

// --- GetActive ---

func (s *ClockInCodeRepositoryTestSuite) TestGetActive_Success() {
	created := s.createCode(60)

	var result *aggregate.ClockInCode
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetActive(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
}

func (s *ClockInCodeRepositoryTestSuite) TestGetActive_ReturnsLatest() {
	s.createCode(60)
	latest := s.createCode(60)

	var result *aggregate.ClockInCode
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetActive(s.ctx, tx)
		return txErr
	})

	s.Require().NoError(err)
	s.Equal(latest.ID, result.ID)
}

func (s *ClockInCodeRepositoryTestSuite) TestGetActive_NoActive() {
	s.createExpiredCode()

	var result *aggregate.ClockInCode
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetActive(s.ctx, tx)
		return txErr
	})

	s.Require().Error(err)
	s.ErrorIs(err, timelogErrors.ErrNoActiveClockInCode)
	s.Nil(result)
}

// --- DeleteExpired ---

func (s *ClockInCodeRepositoryTestSuite) TestDeleteExpired_CleansUp() {
	s.createExpiredCode()
	active := s.createCode(60)

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.DeleteExpired(s.ctx, tx)
	})
	s.Require().NoError(err)

	// Active code should still exist
	var result *aggregate.ClockInCode
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByCode(s.ctx, tx, active.Code)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(active.ID, result.ID)
}

// --- RLS: student can read codes via authenticated role ---

func (s *ClockInCodeRepositoryTestSuite) TestRLS_StudentCanReadCode() {
	created := s.createCode(60)

	// Create a student context
	studentUserID := uuid.New()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)
			 ON CONFLICT DO NOTHING`,
			studentUserID, "rls-student-code@test.com", "hashed", "student",
		)
		return err
	})
	s.Require().NoError(err)

	sid := "99999"
	authCtx := database.AuthContext{
		UserID:    studentUserID.String(),
		StudentID: &sid,
		Role:      "student",
	}

	var result *aggregate.ClockInCode
	err = s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByCode(s.ctx, tx, created.Code)
		return txErr
	})

	s.Require().NoError(err, "student should be able to read clock-in codes for validation")
	s.Equal(created.Code, result.Code)
}

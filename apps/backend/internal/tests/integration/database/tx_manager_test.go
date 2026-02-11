package database_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/stretchr/testify/suite"
)

type TxManagerTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	ctx       context.Context
}

func TestTxManagerTestSuite(t *testing.T) {
	suite.Run(t, new(TxManagerTestSuite))
}

func (s *TxManagerTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.ctx = context.Background()
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
}

func (s *TxManagerTestSuite) TestInAuthTx_SetSessionVariables_WithStudentID() {
	// This test will verify that the session variables are set correctly within the transaction
	studentID := "student-123-id"
	authCtx := database.AuthContext{
		UserID:    "test-123-id",
		StudentID: &studentID,
		Role:      "student",
	}

	var userID, currentStudentID, role string
	err := s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		// Verify that the session variables are set correctly
		if err := tx.QueryRowContext(s.ctx, "SELECT current_setting('app.current_user_id')").Scan(&userID); err != nil {
			return err
		}
		if err := tx.QueryRowContext(s.ctx, "SELECT current_setting('app.current_student_id')").Scan(&currentStudentID); err != nil {
			return err
		}
		if err := tx.QueryRowContext(s.ctx, "SELECT current_setting('app.current_role')").Scan(&role); err != nil {
			return err
		}
		return nil
	})

	s.Require().NoError(err)
	s.Require().Equal(authCtx.UserID, userID)
	s.Require().Equal(*authCtx.StudentID, currentStudentID)
	s.Require().Equal(authCtx.Role, role)
}

func (s *TxManagerTestSuite) TestInAuthTx_SetSessionVariables_NoStudentID() {
	// This test will verify that the session variables are set correctly within the transaction
	authCtx := database.AuthContext{
		UserID:    "test-123-id",
		StudentID: nil,
		Role:      "student",
	}

	var userID, currentStudentID, role string
	err := s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		// Verify that the session variables are set correctly
		if err := tx.QueryRowContext(s.ctx, "SELECT current_setting('app.current_user_id')").Scan(&userID); err != nil {
			return err
		}
		if err := tx.QueryRowContext(s.ctx, "SELECT current_setting('app.current_student_id')").Scan(&currentStudentID); err != nil {
			return err
		}
		if err := tx.QueryRowContext(s.ctx, "SELECT current_setting('app.current_role')").Scan(&role); err != nil {
			return err
		}
		return nil
	})

	s.Require().NoError(err)
	s.Require().Equal(authCtx.UserID, userID)
	s.Require().Empty(currentStudentID)
	s.Require().Equal(authCtx.Role, role)
}

func (s *TxManagerTestSuite) TestInSystemTx_SetsInternalRole() {
	var currentRole string
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return tx.QueryRowContext(s.ctx, "SELECT current_user").Scan(&currentRole)
	})

	s.Require().NoError(err)
	s.Require().Equal("internal", currentRole)
}

func (s *TxManagerTestSuite) TestInAuthTx_RollsBackOnError() {
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, `
			INSERT INTO auth.students (student_id, email_address, first_name, last_name, transcript_metadata, availability)
			VALUES (88888, 'rollback-auth@test.com', 'Original', 'Name', '{}', '{}')
		`)
		return err
	})
	s.Require().NoError(err)
	defer func() {
		_ = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
			_, err := tx.ExecContext(s.ctx, "DELETE FROM auth.students WHERE student_id = 88888")
			return err
		})
	}()

	authCtx := database.AuthContext{
		UserID: "test-user",
		Role:   "admin",
	}

	txErr := s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, "UPDATE auth.students SET first_name = 'Changed' WHERE student_id = 88888")
		if err != nil {
			return err
		}
		return errors.New("intentional error")
	})

	s.Require().Error(txErr)
	s.Require().Contains(txErr.Error(), "intentional error")

	var firstName string
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return tx.QueryRowContext(s.ctx, "SELECT first_name FROM auth.students WHERE student_id = 88888").Scan(&firstName)
	})
	s.Require().NoError(err)
	s.Require().Equal("Original", firstName)
}

func (s *TxManagerTestSuite) TestInSystemTx_RollsBackOnError() {
	txErr := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, `
			INSERT INTO auth.students (student_id, email_address, first_name, last_name, transcript_metadata, availability)
			VALUES (99999, 'rollback@test.com', 'Test', 'Rollback', '{}', '{}')
		`)
		if err != nil {
			return err
		}
		return errors.New("intentional error")
	})

	s.Require().Error(txErr)
	s.Require().Contains(txErr.Error(), "intentional error")

	var count int
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return tx.QueryRowContext(s.ctx, "SELECT COUNT(*) FROM auth.students WHERE student_id = 99999").Scan(&count)
	})
	s.Require().NoError(err)
	s.Require().Equal(0, count)
}

func (s *TxManagerTestSuite) TestInAuthTx_SucceedsOnNoError() {
	authCtx := database.AuthContext{
		UserID: "test-user",
		Role:   "admin",
	}

	txErr := s.txManager.InAuthTx(s.ctx, authCtx, func(tx *sql.Tx) error {
		var result int
		return tx.QueryRowContext(s.ctx, "SELECT 1").Scan(&result)
	})

	s.Require().NoError(txErr)
}

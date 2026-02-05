package database_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/HDR3604/Help-Desk-App/internal/infrastructure/database"
	"github.com/HDR3604/Help-Desk-App/internal/tests/utils"
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

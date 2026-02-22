package user_test

import (
	"context"
	"database/sql"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type UserRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      repository.UserRepositoryInterface
	ctx       context.Context
}

func (s *UserRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = userRepo.NewUserRepository(s.testDB.Logger)
	s.ctx = context.Background()
}
func TestUserRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(UserRepositoryTestSuite))
}
func (s *UserRepositoryTestSuite) TearDownTest() {
	// Use DELETE inside InSystemTx instead of TRUNCATE because the internal role
	// doesn't have TRUNCATE permission on FK-referenced tables (refresh_tokens, auth_tokens).
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(s.ctx, "DELETE FROM auth.refresh_tokens"); err != nil {
			return err
		}
		if _, err := tx.ExecContext(s.ctx, "DELETE FROM auth.auth_tokens"); err != nil {
			return err
		}
		_, err := tx.ExecContext(s.ctx, "DELETE FROM auth.users")
		return err
	})
	s.Require().NoError(err)
}

func (s *UserRepositoryTestSuite) createUser(email, password string, role aggregate.Role, isActive bool) *aggregate.User {
	user, err := aggregate.NewUser(email, password, role)
	s.Require().NoError(err)
	user.IsActive = isActive

	var result *aggregate.User
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, user)
		return txErr
	})
	s.Require().NoError(err)
	return result
}

func (s *UserRepositoryTestSuite) TestCreate_DuplicateEmail() {
	email := "dupe@my.uwi.edu"
	user1, err := aggregate.NewUser(email, "P@ss1234", aggregate.Role_Student)
	s.Require().NoError(err)
	user2, err := aggregate.NewUser(email, "P@ss2345", aggregate.Role_Student)
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := s.repo.Create(s.ctx, tx, user1)
		return err
	})
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := s.repo.Create(s.ctx, tx, user2)
		return err
	})
	s.Require().Error(err)
}

func (s *UserRepositoryTestSuite) TestGetByEmail_Success() {
	user := s.createUser("getbyemail@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, true)

	var result *aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByEmail(s.ctx, tx, user.Email)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(user.ID, result.ID)
	s.Equal(user.Email, result.Email)
}

func (s *UserRepositoryTestSuite) TestList_All() {
	s.createUser("list1@uwi.edu", "TestP@ss123", aggregate.Role_Admin, true)
	s.createUser("list2@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, false)
	s.createUser("list3@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, true)

	var result []*aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.List(s.ctx, tx)
		return txErr
	})
	s.Require().NoError(err)
	s.Len(result, 3)
}

func (s *UserRepositoryTestSuite) TestListByRole_Success() {
	s.createUser("role1@uwi.edu", "TestP@ss123", aggregate.Role_Admin, true)
	s.createUser("role2@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, true)
	s.createUser("role3@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, false)

	var result []*aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.ListByRole(s.ctx, tx, string(aggregate.Role_Student))
		return txErr
	})
	s.Require().NoError(err)
	s.Len(result, 2)
	for _, user := range result {
		s.Equal(aggregate.Role_Student, user.Role)
	}
}

func (s *UserRepositoryTestSuite) TestListActive_Success() {
	s.createUser("active1@uwi.edu", "TestP@ss123", aggregate.Role_Admin, true)
	s.createUser("inactive1@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, false)
	s.createUser("active2@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, true)

	var result []*aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.ListActive(s.ctx, tx)
		return txErr
	})
	s.Require().NoError(err)
	s.Len(result, 2)
	for _, user := range result {
		s.True(user.IsActive)
	}
}

func (s *UserRepositoryTestSuite) TestUpdate_Success() {
	user := s.createUser("update@my.uwi.edu", "TestP@ss123", aggregate.Role_Student, true)
	user.Email = "updated@my.uwi.edu"
	user.IsActive = false

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, user)
	})
	s.Require().NoError(err)

	var result *aggregate.User
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, user.ID.String())
		return txErr
	})
	s.Require().NoError(err)
	s.Equal("updated@my.uwi.edu", result.Email)
	s.False(result.IsActive)
}

func (s *UserRepositoryTestSuite) TestCreate_Success() {
	user, err := aggregate.NewUser("admin@uwi.edu", "SecureP@ss123", aggregate.Role_Admin)
	s.Require().NoError(err)

	var result *aggregate.User
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, user)
		return txErr
	})
	s.Require().NoError(err)

	s.NotZero(result.ID)
	s.Equal("admin@uwi.edu", result.Email)
	s.Equal(aggregate.Role_Admin, result.Role)
	s.True(result.IsActive)
}

func (s *UserRepositoryTestSuite) TestGetByID_Success() {
	user := s.createUser("admin@uwi.edu", "SecureP@ss123", aggregate.Role_Admin, true)

	var result *aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, user.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(user.ID, result.ID)
	s.Equal(user.Email, result.Email)
	s.Equal(user.Role, result.Role)
}

func (s *UserRepositoryTestSuite) TestGetByID_NotFound() {
	nonExistentID := uuid.New().String()

	var result *aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, nonExistentID)
		return txErr
	})
	s.Nil(result)
	s.Error(err)
}

func (s *UserRepositoryTestSuite) TestGetByID_InvalidUUID() {
	var result *aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByID(s.ctx, tx, "invalid-uuid")
		return txErr
	})

	s.Nil(result)
	s.Error(err)
}

func (s *UserRepositoryTestSuite) TestGetByEmail_NotFound() {
	var result *aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByEmail(s.ctx, tx, "nonexistent@my.uwi.edu")
		return txErr
	})

	s.Nil(result)
	s.Error(err)
}

func (s *UserRepositoryTestSuite) TestUpdate_NonExistentUser() {
	user := &aggregate.User{
		ID:       uuid.New(),
		Email:    "ghost@my.uwi.edu",
		Password: "SecureP@ss123",
		Role:     aggregate.Role_Student,
		IsActive: true,
	}

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.Update(s.ctx, tx, user)
	})
	// Update on non-existent user should succeed but affect 0 rows
	s.Require().NoError(err)
}

func (s *UserRepositoryTestSuite) TestList_Empty() {
	var result []*aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.List(s.ctx, tx)
		return txErr
	})
	s.Require().NoError(err)

	s.Len(result, 0)
}

func (s *UserRepositoryTestSuite) TestListByRole_NoResults() {
	s.createUser("admin1@uwi.edu", "SecureP@ss123", aggregate.Role_Admin, true)

	var result []*aggregate.User
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.ListByRole(s.ctx, tx, string(aggregate.Role_Student))
		return txErr
	})
	s.Require().NoError(err)

	s.Len(result, 0)
}

func (s *UserRepositoryTestSuite) TestDeactivateByEmailDomain_StudentDomain() {
	s.createUser("admin@uwi.edu", "SecureP@ss123", aggregate.Role_Admin, true)
	user1 := s.createUser("student1@my.uwi.edu", "SecureP@ss123", aggregate.Role_Student, true)
	user2 := s.createUser("student2@my.uwi.edu", "SecureP@ss123", aggregate.Role_Student, true)

	// Deactivate all students
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.DeactivateByEmailDomain(s.ctx, tx, aggregate.EmailDomain_Student)
	})
	s.Require().NoError(err)

	// Verify deactivation
	var student1Result, student2Result *aggregate.User

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		student1Result, txErr = s.repo.GetByID(s.ctx, tx, user1.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		student2Result, txErr = s.repo.GetByID(s.ctx, tx, user2.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	s.False(student1Result.IsActive)
	s.False(student2Result.IsActive)
}

func (s *UserRepositoryTestSuite) TestDeactivateByEmailDomain_StaffDomain() {
	user1 := s.createUser("staff@uwi.edu", "SecureP@ss123", aggregate.Role_Admin, true)
	user2 := s.createUser("staff2@uwi.edu", "SecureP@ss123", aggregate.Role_Admin, true)
	s.createUser("student@my.uwi.edu", "SecureP@ss123", aggregate.Role_Student, true)

	// Deactivate all staff
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.DeactivateByEmailDomain(s.ctx, tx, aggregate.EmailDomain_Staff)
	})
	s.Require().NoError(err)

	// Verify deactivation
	var staffResult1, staffResult2 *aggregate.User
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		staffResult1, txErr = s.repo.GetByID(s.ctx, tx, user1.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		staffResult2, txErr = s.repo.GetByID(s.ctx, tx, user2.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	s.False(staffResult1.IsActive)
	s.False(staffResult2.IsActive)
}

func (s *UserRepositoryTestSuite) TestDeactivateByEmailDomain_AlreadyInactive() {
	user1 := s.createUser("student1@my.uwi.edu", "SecureP@ss123", aggregate.Role_Student, true)
	user2 := s.createUser("student2@my.uwi.edu", "SecureP@ss123", aggregate.Role_Student, false) // Already inactive

	// Deactivate students
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.DeactivateByEmailDomain(s.ctx, tx, aggregate.EmailDomain_Student)
	})
	s.Require().NoError(err)

	// Verify both are inactive
	var result1, result2 *aggregate.User
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result1, txErr = s.repo.GetByID(s.ctx, tx, user1.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result2, txErr = s.repo.GetByID(s.ctx, tx, user2.ID.String())
		return txErr
	})
	s.Require().NoError(err)

	s.False(result1.IsActive)
	s.False(result2.IsActive)
}

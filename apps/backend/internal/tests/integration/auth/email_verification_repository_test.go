package auth_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/repository"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type EmailVerificationRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      repository.EmailVerificationRepositoryInterface
	ctx       context.Context
	userID    uuid.UUID
}

func TestEmailVerificationRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(EmailVerificationRepositoryTestSuite))
}

func (s *EmailVerificationRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = authRepo.NewEmailVerificationRepository(s.testDB.Logger)
	s.ctx = context.Background()

	// Seed a user for FK constraints
	s.userID = uuid.New()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			s.userID, "verifytest@my.uwi.edu", "TestPass123", "student",
		)
		return err
	})
	s.Require().NoError(err)
}

func (s *EmailVerificationRepositoryTestSuite) TearDownTest() {
	// Use DELETE within InSystemTx because the `internal` role has DELETE
	// but not TRUNCATE on auth tables (FORCE RLS + limited GRANTs).
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, "DELETE FROM auth.email_verifications")
		return err
	})
	s.Require().NoError(err)
}

// createVerification is a helper that creates an EmailVerification via the aggregate constructor
// and persists it through the repository. It returns the created verification and the raw token.
func (s *EmailVerificationRepositoryTestSuite) createVerification(userID uuid.UUID, ttl int) (*aggregate.EmailVerification, string) {
	verification, rawToken, err := aggregate.NewEmailVerification(userID, ttl)
	s.Require().NoError(err)

	var created *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		created, txErr = s.repo.Create(s.ctx, tx, verification)
		return txErr
	})
	s.Require().NoError(err)

	return created, rawToken
}

// ==================== Create ====================

func (s *EmailVerificationRepositoryTestSuite) TestCreate_Success() {
	verification, _, err := aggregate.NewEmailVerification(s.userID, 3600)
	s.Require().NoError(err)
	s.Require().NotNil(verification)

	var result *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, verification)
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(verification.ID, result.ID)
	s.Equal(s.userID, result.UserID)
	s.Equal(verification.TokenHash, result.TokenHash)
	s.Nil(result.UsedAt)
	s.False(result.CreatedAt.IsZero())
	s.False(result.ExpiresAt.IsZero())
}

func (s *EmailVerificationRepositoryTestSuite) TestCreate_FKViolation() {
	nonExistentUserID := uuid.New()
	verification, _, err := aggregate.NewEmailVerification(nonExistentUserID, 3600)
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, txErr := s.repo.Create(s.ctx, tx, verification)
		return txErr
	})
	s.Require().Error(err)
}

// ==================== GetByTokenHash ====================

func (s *EmailVerificationRepositoryTestSuite) TestGetByTokenHash_Success() {
	created, rawToken := s.createVerification(s.userID, 3600)

	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(created.ID, result.ID)
	s.Equal(created.UserID, result.UserID)
	s.Equal(created.TokenHash, result.TokenHash)
	s.Equal(created.ExpiresAt.Format("2006-01-02"), result.ExpiresAt.Format("2006-01-02"))
	s.Nil(result.UsedAt)
}

func (s *EmailVerificationRepositoryTestSuite) TestGetByTokenHash_NotFound() {
	randomHash, err := aggregate.HashToken("nonexistent-token")
	s.Require().NoError(err)

	var result *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, randomHash)
		return txErr
	})
	s.Nil(result)
	s.Require().ErrorIs(err, authErrors.ErrVerificationTokenInvalid)
}

func (s *EmailVerificationRepositoryTestSuite) TestGetByTokenHash_ReturnsUsedToken() {
	created, rawToken := s.createVerification(s.userID, 3600)

	// Invalidate all tokens for this user (sets UsedAt)
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID)
	})
	s.Require().NoError(err)

	// GetByTokenHash should still return the token even though it's used
	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(created.ID, result.ID)
	s.NotNil(result.UsedAt)
}

// ==================== InvalidateAllByUserID ====================

func (s *EmailVerificationRepositoryTestSuite) TestInvalidateAllByUserID_Success() {
	v1, rawToken1 := s.createVerification(s.userID, 3600)
	v2, rawToken2 := s.createVerification(s.userID, 3600)
	v3, rawToken3 := s.createVerification(s.userID, 3600)

	// Invalidate all
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID)
	})
	s.Require().NoError(err)

	// Verify all three have UsedAt set
	for _, tc := range []struct {
		id       uuid.UUID
		rawToken string
	}{
		{v1.ID, rawToken1},
		{v2.ID, rawToken2},
		{v3.ID, rawToken3},
	} {
		tokenHash, err := aggregate.HashToken(tc.rawToken)
		s.Require().NoError(err)

		var result *aggregate.EmailVerification
		err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
			var txErr error
			result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
			return txErr
		})
		s.Require().NoError(err)
		s.Equal(tc.id, result.ID)
		s.NotNil(result.UsedAt, "verification %s should have UsedAt set", tc.id)
	}
}

func (s *EmailVerificationRepositoryTestSuite) TestInvalidateAllByUserID_NoTokens() {
	userWithNoVerifications := uuid.New()

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, userWithNoVerifications)
	})
	s.Require().NoError(err)
}

func (s *EmailVerificationRepositoryTestSuite) TestInvalidateAllByUserID_SkipsAlreadyUsed() {
	// Create 2 verifications
	_, rawToken1 := s.createVerification(s.userID, 3600)
	_, rawToken2 := s.createVerification(s.userID, 3600)

	// Invalidate all (marks both as used)
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID)
	})
	s.Require().NoError(err)

	// Record the UsedAt timestamp of the first two
	hash1, err := aggregate.HashToken(rawToken1)
	s.Require().NoError(err)
	hash2, err := aggregate.HashToken(rawToken2)
	s.Require().NoError(err)

	var v1After, v2After *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		v1After, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash1)
		if txErr != nil {
			return txErr
		}
		v2After, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash2)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(v1After.UsedAt)
	s.NotNil(v2After.UsedAt)
	usedAt1 := *v1After.UsedAt
	usedAt2 := *v2After.UsedAt

	// Sleep briefly so any new UsedAt timestamp would differ
	time.Sleep(10 * time.Millisecond)

	// Create a third (fresh) verification
	_, rawToken3 := s.createVerification(s.userID, 3600)

	// Invalidate again — only the third should be newly invalidated
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID)
	})
	s.Require().NoError(err)

	// Verify the first two still have their original UsedAt (unchanged)
	var v1Final, v2Final *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		v1Final, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash1)
		if txErr != nil {
			return txErr
		}
		v2Final, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash2)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(usedAt1.Format(time.RFC3339Nano), v1Final.UsedAt.Format(time.RFC3339Nano))
	s.Equal(usedAt2.Format(time.RFC3339Nano), v2Final.UsedAt.Format(time.RFC3339Nano))

	// Verify the third is now also invalidated
	hash3, err := aggregate.HashToken(rawToken3)
	s.Require().NoError(err)
	var v3Final *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		v3Final, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash3)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(v3Final.UsedAt, "third verification should have UsedAt set")
}

// ==================== DeleteExpired ====================

func (s *EmailVerificationRepositoryTestSuite) TestDeleteExpired_Success() {
	// Create an expired verification (TTL = -3600, i.e. expired 1 hour ago)
	s.createVerification(s.userID, -3600)

	// Create an active verification (TTL = 3600, expires in 1 hour)
	_, activeRawToken := s.createVerification(s.userID, 3600)

	// Delete expired verifications
	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now())
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(1), count)

	// Verify the active verification is still findable
	activeHash, err := aggregate.HashToken(activeRawToken)
	s.Require().NoError(err)

	var result *aggregate.EmailVerification
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, activeHash)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result)
}

func (s *EmailVerificationRepositoryTestSuite) TestDeleteExpired_NoneExpired() {
	// Create only active verifications
	s.createVerification(s.userID, 3600)
	s.createVerification(s.userID, 7200)

	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now())
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(0), count)
}

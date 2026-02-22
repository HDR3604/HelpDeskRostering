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

type AuthTokenRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      repository.AuthTokenRepositoryInterface
	ctx       context.Context
	userID    uuid.UUID
}

func TestAuthTokenRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(AuthTokenRepositoryTestSuite))
}

func (s *AuthTokenRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = authRepo.NewAuthTokenRepository(s.testDB.Logger)
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

func (s *AuthTokenRepositoryTestSuite) TearDownTest() {
	// Use DELETE within InSystemTx because the `internal` role has DELETE
	// but not TRUNCATE on auth tables (FORCE RLS + limited GRANTs).
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, "DELETE FROM auth.auth_tokens")
		return err
	})
	s.Require().NoError(err)
}

// createAuthToken is a helper that creates an AuthToken via the aggregate constructor
// and persists it through the repository. It returns the created token and the raw token.
func (s *AuthTokenRepositoryTestSuite) createAuthToken(userID uuid.UUID, ttl int, tokenType string) (*aggregate.AuthToken, string) {
	token, rawToken, err := aggregate.NewAuthToken(userID, ttl, tokenType)
	s.Require().NoError(err)

	var created *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		created, txErr = s.repo.Create(s.ctx, tx, token)
		return txErr
	})
	s.Require().NoError(err)

	return created, rawToken
}

// ==================== Create ====================

func (s *AuthTokenRepositoryTestSuite) TestCreate_Success() {
	token, _, err := aggregate.NewAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)
	s.Require().NoError(err)
	s.Require().NotNil(token)

	var result *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Create(s.ctx, tx, token)
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(token.ID, result.ID)
	s.Equal(s.userID, result.UserID)
	s.Equal(token.TokenHash, result.TokenHash)
	s.Equal(aggregate.AuthTokenType_EmailVerification, result.Type)
	s.Nil(result.UsedAt)
	s.False(result.CreatedAt.IsZero())
	s.False(result.ExpiresAt.IsZero())
}

func (s *AuthTokenRepositoryTestSuite) TestCreate_FKViolation() {
	nonExistentUserID := uuid.New()
	token, _, err := aggregate.NewAuthToken(nonExistentUserID, 3600, aggregate.AuthTokenType_EmailVerification)
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, txErr := s.repo.Create(s.ctx, tx, token)
		return txErr
	})
	s.Require().Error(err)
}

// ==================== GetByTokenHash ====================

func (s *AuthTokenRepositoryTestSuite) TestGetByTokenHash_Success() {
	created, rawToken := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(created.ID, result.ID)
	s.Equal(created.UserID, result.UserID)
	s.Equal(created.TokenHash, result.TokenHash)
	s.Equal(created.ExpiresAt.Format("2006-01-02"), result.ExpiresAt.Format("2006-01-02"))
	s.Nil(result.UsedAt)
}

func (s *AuthTokenRepositoryTestSuite) TestGetByTokenHash_NotFound() {
	randomHash, err := aggregate.HashToken("nonexistent-token")
	s.Require().NoError(err)

	var result *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, randomHash, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Nil(result)
	s.Require().ErrorIs(err, authErrors.ErrVerificationTokenInvalid)
}

func (s *AuthTokenRepositoryTestSuite) TestGetByTokenHash_WrongType() {
	// Create an email verification token
	_, rawToken := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	// Try to look it up as a password_reset token — should not find it
	var result *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash, aggregate.AuthTokenType_PasswordReset)
		return txErr
	})
	s.Nil(result)
	s.Require().ErrorIs(err, authErrors.ErrPasswordResetTokenInvalid)
}

func (s *AuthTokenRepositoryTestSuite) TestGetByTokenHash_ReturnsUsedToken() {
	created, rawToken := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	// Invalidate all tokens for this user (sets UsedAt)
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID, aggregate.AuthTokenType_EmailVerification)
	})
	s.Require().NoError(err)

	// GetByTokenHash should still return the token even though it's used
	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)

	s.Equal(created.ID, result.ID)
	s.NotNil(result.UsedAt)
}

// ==================== InvalidateAllByUserID ====================

func (s *AuthTokenRepositoryTestSuite) TestInvalidateAllByUserID_Success() {
	v1, rawToken1 := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)
	v2, rawToken2 := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)
	v3, rawToken3 := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	// Invalidate all
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID, aggregate.AuthTokenType_EmailVerification)
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

		var result *aggregate.AuthToken
		err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
			var txErr error
			result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash, aggregate.AuthTokenType_EmailVerification)
			return txErr
		})
		s.Require().NoError(err)
		s.Equal(tc.id, result.ID)
		s.NotNil(result.UsedAt, "token %s should have UsedAt set", tc.id)
	}
}

func (s *AuthTokenRepositoryTestSuite) TestInvalidateAllByUserID_NoTokens() {
	userWithNoTokens := uuid.New()

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, userWithNoTokens, aggregate.AuthTokenType_EmailVerification)
	})
	s.Require().NoError(err)
}

func (s *AuthTokenRepositoryTestSuite) TestInvalidateAllByUserID_OnlyInvalidatesMatchingType() {
	// Create one email verification and one password reset token
	_, emailRawToken := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)
	_, resetRawToken := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_PasswordReset)

	// Invalidate only email verification tokens
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID, aggregate.AuthTokenType_EmailVerification)
	})
	s.Require().NoError(err)

	// Email verification token should be invalidated
	emailHash, err := aggregate.HashToken(emailRawToken)
	s.Require().NoError(err)
	var emailResult *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		emailResult, txErr = s.repo.GetByTokenHash(s.ctx, tx, emailHash, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(emailResult.UsedAt, "email verification token should be invalidated")

	// Password reset token should still be valid
	resetHash, err := aggregate.HashToken(resetRawToken)
	s.Require().NoError(err)
	var resetResult *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		resetResult, txErr = s.repo.GetByTokenHash(s.ctx, tx, resetHash, aggregate.AuthTokenType_PasswordReset)
		return txErr
	})
	s.Require().NoError(err)
	s.Nil(resetResult.UsedAt, "password reset token should NOT be invalidated")
}

func (s *AuthTokenRepositoryTestSuite) TestInvalidateAllByUserID_SkipsAlreadyUsed() {
	// Create 2 tokens
	_, rawToken1 := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)
	_, rawToken2 := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	// Invalidate all (marks both as used)
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID, aggregate.AuthTokenType_EmailVerification)
	})
	s.Require().NoError(err)

	// Record the UsedAt timestamp of the first two
	hash1, err := aggregate.HashToken(rawToken1)
	s.Require().NoError(err)
	hash2, err := aggregate.HashToken(rawToken2)
	s.Require().NoError(err)

	var v1After, v2After *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		v1After, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash1, aggregate.AuthTokenType_EmailVerification)
		if txErr != nil {
			return txErr
		}
		v2After, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash2, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(v1After.UsedAt)
	s.NotNil(v2After.UsedAt)
	usedAt1 := *v1After.UsedAt
	usedAt2 := *v2After.UsedAt

	// Sleep briefly so any new UsedAt timestamp would differ
	time.Sleep(10 * time.Millisecond)

	// Create a third (fresh) token
	_, rawToken3 := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	// Invalidate again — only the third should be newly invalidated
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.InvalidateAllByUserID(s.ctx, tx, s.userID, aggregate.AuthTokenType_EmailVerification)
	})
	s.Require().NoError(err)

	// Verify the first two still have their original UsedAt (unchanged)
	var v1Final, v2Final *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		v1Final, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash1, aggregate.AuthTokenType_EmailVerification)
		if txErr != nil {
			return txErr
		}
		v2Final, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash2, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(usedAt1.Format(time.RFC3339Nano), v1Final.UsedAt.Format(time.RFC3339Nano))
	s.Equal(usedAt2.Format(time.RFC3339Nano), v2Final.UsedAt.Format(time.RFC3339Nano))

	// Verify the third is now also invalidated
	hash3, err := aggregate.HashToken(rawToken3)
	s.Require().NoError(err)
	var v3Final *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		v3Final, txErr = s.repo.GetByTokenHash(s.ctx, tx, hash3, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(v3Final.UsedAt, "third token should have UsedAt set")
}

// ==================== DeleteExpired ====================

func (s *AuthTokenRepositoryTestSuite) TestDeleteExpired_Success() {
	// Create an expired token (TTL = -3600, i.e. expired 1 hour ago)
	s.createAuthToken(s.userID, -3600, aggregate.AuthTokenType_EmailVerification)

	// Create an active token (TTL = 3600, expires in 1 hour)
	_, activeRawToken := s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)

	// Delete expired tokens
	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now(), aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(1), count)

	// Verify the active token is still findable
	activeHash, err := aggregate.HashToken(activeRawToken)
	s.Require().NoError(err)

	var result *aggregate.AuthToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, activeHash, aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result)
}

func (s *AuthTokenRepositoryTestSuite) TestDeleteExpired_NoneExpired() {
	// Create only active tokens
	s.createAuthToken(s.userID, 3600, aggregate.AuthTokenType_EmailVerification)
	s.createAuthToken(s.userID, 7200, aggregate.AuthTokenType_EmailVerification)

	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now(), aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(0), count)
}

func (s *AuthTokenRepositoryTestSuite) TestDeleteExpired_OnlyDeletesMatchingType() {
	// Create an expired email verification token
	s.createAuthToken(s.userID, -3600, aggregate.AuthTokenType_EmailVerification)

	// Create an expired password reset token
	s.createAuthToken(s.userID, -3600, aggregate.AuthTokenType_PasswordReset)

	// Delete only expired email verification tokens
	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now(), aggregate.AuthTokenType_EmailVerification)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(1), count)

	// Delete expired password reset tokens
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now(), aggregate.AuthTokenType_PasswordReset)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(1), count)
}

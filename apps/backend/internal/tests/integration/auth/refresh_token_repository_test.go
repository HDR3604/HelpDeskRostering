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

type RefreshTokenRepositoryTestSuite struct {
	suite.Suite
	testDB    *utils.TestDB
	txManager database.TxManagerInterface
	repo      repository.RefreshTokenRepositoryInterface
	ctx       context.Context
	userID    uuid.UUID
}

func TestRefreshTokenRepositoryTestSuite(t *testing.T) {
	suite.Run(t, new(RefreshTokenRepositoryTestSuite))
}

func (s *RefreshTokenRepositoryTestSuite) SetupSuite() {
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	s.repo = authRepo.NewRefreshTokenRepository(s.testDB.Logger)
	s.ctx = context.Background()
	s.userID = s.seedUser("testuser@my.uwi.edu")
}

func (s *RefreshTokenRepositoryTestSuite) TearDownTest() {
	// Use DELETE within InSystemTx because the `internal` role has DELETE
	// but not TRUNCATE on auth tables (FORCE RLS + limited GRANTs).
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx, "DELETE FROM auth.refresh_tokens")
		return err
	})
	s.Require().NoError(err)
}

// seedUser inserts a user via raw SQL and returns the generated userID.
func (s *RefreshTokenRepositoryTestSuite) seedUser(email string) uuid.UUID {
	userID := uuid.New()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			userID, email, "hashedpassword123", "student",
		)
		return err
	})
	s.Require().NoError(err)
	return userID
}

// createToken creates a refresh token via the repository and returns the persisted token along with the raw token string.
func (s *RefreshTokenRepositoryTestSuite) createToken(userID uuid.UUID, ttl int) (*aggregate.RefreshToken, string) {
	token, rawToken, err := aggregate.NewRefreshToken(userID, ttl)
	s.Require().NoError(err)

	var created *aggregate.RefreshToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		created, txErr = s.repo.Create(s.ctx, tx, token)
		return txErr
	})
	s.Require().NoError(err)
	return created, rawToken
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

func (s *RefreshTokenRepositoryTestSuite) TestCreate_Success() {
	token, _ := s.createToken(s.userID, 3600)

	s.NotEqual(uuid.Nil, token.ID)
	s.Equal(s.userID, token.UserID)
	s.NotEmpty(token.TokenHash)
	s.False(token.ExpiresAt.IsZero())
	s.Nil(token.RevokedAt)
	s.False(token.CreatedAt.IsZero())
	s.Nil(token.ReplacedBy)
}

func (s *RefreshTokenRepositoryTestSuite) TestCreate_FKViolation() {
	nonExistentUserID := uuid.New()
	token, _, err := aggregate.NewRefreshToken(nonExistentUserID, 3600)
	s.Require().NoError(err)

	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, txErr := s.repo.Create(s.ctx, tx, token)
		return txErr
	})
	s.Error(err)
}

// ---------------------------------------------------------------------------
// GetByTokenHash
// ---------------------------------------------------------------------------

func (s *RefreshTokenRepositoryTestSuite) TestGetByTokenHash_Success() {
	created, rawToken := s.createToken(s.userID, 3600)

	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.RefreshToken
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
	s.Nil(result.RevokedAt)
}

func (s *RefreshTokenRepositoryTestSuite) TestGetByTokenHash_NotFound() {
	randomHash, err := aggregate.HashToken("nonexistent-token-string")
	s.Require().NoError(err)

	var result *aggregate.RefreshToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, randomHash)
		return txErr
	})
	s.ErrorIs(err, authErrors.ErrInvalidRefreshToken)
	s.Nil(result)
}

func (s *RefreshTokenRepositoryTestSuite) TestGetByTokenHash_ReturnsRevoked() {
	created, rawToken := s.createToken(s.userID, 3600)

	// Revoke the token
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeByID(s.ctx, tx, created.ID, nil)
	})
	s.Require().NoError(err)

	// GetByTokenHash should still return the revoked token
	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.RefreshToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(created.ID, result.ID)
	s.NotNil(result.RevokedAt)
}

// ---------------------------------------------------------------------------
// RevokeByID
// ---------------------------------------------------------------------------

func (s *RefreshTokenRepositoryTestSuite) TestRevokeByID_Success() {
	created, rawToken := s.createToken(s.userID, 3600)

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeByID(s.ctx, tx, created.ID, nil)
	})
	s.Require().NoError(err)

	// Verify RevokedAt is set
	tokenHash, err := aggregate.HashToken(rawToken)
	s.Require().NoError(err)

	var result *aggregate.RefreshToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result.RevokedAt)
	s.Nil(result.ReplacedBy)
}

func (s *RefreshTokenRepositoryTestSuite) TestRevokeByID_WithReplacedBy() {
	first, rawFirst := s.createToken(s.userID, 3600)
	second, _ := s.createToken(s.userID, 3600)

	// Revoke first token, pointing to second as its replacement
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeByID(s.ctx, tx, first.ID, &second.ID)
	})
	s.Require().NoError(err)

	// Verify ReplacedBy is populated on the first token
	tokenHash, err := aggregate.HashToken(rawFirst)
	s.Require().NoError(err)

	var result *aggregate.RefreshToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result.RevokedAt)
	s.Require().NotNil(result.ReplacedBy)
	s.Equal(second.ID, *result.ReplacedBy)
}

// ---------------------------------------------------------------------------
// RevokeAllByUserID
// ---------------------------------------------------------------------------

func (s *RefreshTokenRepositoryTestSuite) TestRevokeAllByUserID_Success() {
	_, raw1 := s.createToken(s.userID, 3600)
	_, raw2 := s.createToken(s.userID, 3600)
	_, raw3 := s.createToken(s.userID, 3600)

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeAllByUserID(s.ctx, tx, s.userID)
	})
	s.Require().NoError(err)

	// Verify all three tokens are revoked
	rawTokens := []string{raw1, raw2, raw3}
	for _, raw := range rawTokens {
		tokenHash, err := aggregate.HashToken(raw)
		s.Require().NoError(err)

		var result *aggregate.RefreshToken
		err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
			var txErr error
			result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
			return txErr
		})
		s.Require().NoError(err)
		s.NotNil(result.RevokedAt, "token with hash %s should be revoked", tokenHash)
	}
}

func (s *RefreshTokenRepositoryTestSuite) TestRevokeAllByUserID_SkipsAlreadyRevoked() {
	token1, raw1 := s.createToken(s.userID, 3600)
	_, raw2 := s.createToken(s.userID, 3600)

	// Manually revoke the first token
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeByID(s.ctx, tx, token1.ID, nil)
	})
	s.Require().NoError(err)

	// Now revoke all -- should not error even though token1 is already revoked
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeAllByUserID(s.ctx, tx, s.userID)
	})
	s.Require().NoError(err)

	// Verify both tokens are revoked
	rawTokens := []string{raw1, raw2}
	for _, raw := range rawTokens {
		tokenHash, err := aggregate.HashToken(raw)
		s.Require().NoError(err)

		var result *aggregate.RefreshToken
		err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
			var txErr error
			result, txErr = s.repo.GetByTokenHash(s.ctx, tx, tokenHash)
			return txErr
		})
		s.Require().NoError(err)
		s.NotNil(result.RevokedAt)
	}
}

func (s *RefreshTokenRepositoryTestSuite) TestRevokeAllByUserID_NoTokens() {
	noTokensUserID := uuid.New()

	// Seed a user with no tokens so the FK is satisfied if needed
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.users (user_id, email_address, password, role) VALUES ($1, $2, $3, $4)`,
			noTokensUserID, "notokens@my.uwi.edu", "hashedpassword123", "student",
		)
		return err
	})
	s.Require().NoError(err)

	// Should not error even though the user has no tokens
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		return s.repo.RevokeAllByUserID(s.ctx, tx, noTokensUserID)
	})
	s.Require().NoError(err)
}

// ---------------------------------------------------------------------------
// DeleteExpired
// ---------------------------------------------------------------------------

func (s *RefreshTokenRepositoryTestSuite) TestDeleteExpired_Success() {
	// Create an expired token (TTL = -3600, i.e. expired 1 hour ago)
	_, _ = s.createToken(s.userID, -3600)

	// Create an active token (TTL = 3600, i.e. expires in 1 hour)
	_, rawActive := s.createToken(s.userID, 3600)

	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now())
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(1), count)

	// Verify the active token is still findable
	activeHash, err := aggregate.HashToken(rawActive)
	s.Require().NoError(err)

	var result *aggregate.RefreshToken
	err = s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByTokenHash(s.ctx, tx, activeHash)
		return txErr
	})
	s.Require().NoError(err)
	s.NotNil(result)
}

func (s *RefreshTokenRepositoryTestSuite) TestDeleteExpired_NoneExpired() {
	// Create only active tokens
	s.createToken(s.userID, 3600)
	s.createToken(s.userID, 7200)

	var count int64
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		var txErr error
		count, txErr = s.repo.DeleteExpired(s.ctx, tx, time.Now())
		return txErr
	})
	s.Require().NoError(err)
	s.Equal(int64(0), count)
}

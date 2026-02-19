package auth_test

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

type AuthServiceTestSuite struct {
	suite.Suite
	userRepo              *mocks.MockUserRepository
	refreshTokenRepo      *mocks.MockRefreshTokenRepository
	authTokenRepo         *mocks.MockAuthTokenRepository
	emailSender           *mocks.MockEmailSender
	service               service.AuthServiceInterface
	ctx                   context.Context
}

func TestAuthServiceTestSuite(t *testing.T) {
	suite.Run(t, new(AuthServiceTestSuite))
}

func (s *AuthServiceTestSuite) SetupTest() {
	s.userRepo = &mocks.MockUserRepository{}
	s.refreshTokenRepo = &mocks.MockRefreshTokenRepository{}
	s.authTokenRepo = &mocks.MockAuthTokenRepository{}
	s.emailSender = &mocks.MockEmailSender{}
	s.ctx = context.Background()

	s.service = service.NewAuthService(
		zap.NewNop(),
		&mocks.StubTxManager{},
		s.userRepo,
		s.refreshTokenRepo,
		s.authTokenRepo,
		s.emailSender,
		[]byte("test-secret-key-that-is-at-least-32-bytes!"),
		3600,  // accessTokenTTL
		86400, // refreshTokenTTL
		86400, // verificationTokenTTL
		"http://localhost:3000",
		"noreply@test.com",
	)
}

// ---------------------------------------------------------------------------
// Helpers (standalone)
// ---------------------------------------------------------------------------

func hashPassword(password string) string {
	hash, _ := bcrypt.GenerateFromPassword([]byte(password), 14)
	return string(hash)
}

// ---------------------------------------------------------------------------
// Helpers (suite methods)
// ---------------------------------------------------------------------------

func (s *AuthServiceTestSuite) newVerifiedAdmin() *userAggregate.User {
	now := time.Now()
	return &userAggregate.User{
		ID:              uuid.New(),
		Email:           "admin@uwi.edu",
		Password:        hashPassword("P@ssword1"),
		Role:            userAggregate.Role_Admin,
		IsActive:        true,
		EmailVerifiedAt: &now,
	}
}

func (s *AuthServiceTestSuite) newVerifiedStudent() *userAggregate.User {
	now := time.Now()
	return &userAggregate.User{
		ID:              uuid.New(),
		Email:           "student@my.uwi.edu",
		Password:        hashPassword("P@ssword1"),
		Role:            userAggregate.Role_Student,
		IsActive:        true,
		EmailVerifiedAt: &now,
	}
}

func (s *AuthServiceTestSuite) newUnverifiedUser() *userAggregate.User {
	return &userAggregate.User{
		ID:              uuid.New(),
		Email:           "admin@uwi.edu",
		Password:        hashPassword("P@ssword1"),
		Role:            userAggregate.Role_Admin,
		IsActive:        true,
		EmailVerifiedAt: nil,
	}
}

func (s *AuthServiceTestSuite) newInactiveUser() *userAggregate.User {
	now := time.Now()
	return &userAggregate.User{
		ID:              uuid.New(),
		Email:           "admin@uwi.edu",
		Password:        hashPassword("P@ssword1"),
		Role:            userAggregate.Role_Admin,
		IsActive:        false,
		EmailVerifiedAt: &now,
	}
}

func (s *AuthServiceTestSuite) newActiveRefreshToken(userID uuid.UUID) *aggregate.RefreshToken {
	return &aggregate.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "somehash",
		ExpiresAt: time.Now().Add(24 * time.Hour),
		RevokedAt: nil,
		CreatedAt: time.Now(),
	}
}

func (s *AuthServiceTestSuite) newRevokedRefreshToken(userID uuid.UUID) *aggregate.RefreshToken {
	now := time.Now()
	return &aggregate.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "somehash",
		ExpiresAt: time.Now().Add(24 * time.Hour),
		RevokedAt: &now,
		CreatedAt: time.Now(),
	}
}

func (s *AuthServiceTestSuite) newExpiredRefreshToken(userID uuid.UUID) *aggregate.RefreshToken {
	return &aggregate.RefreshToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "somehash",
		ExpiresAt: time.Now().Add(-1 * time.Hour),
		RevokedAt: nil,
		CreatedAt: time.Now(),
	}
}

func (s *AuthServiceTestSuite) newValidAuthToken(userID uuid.UUID, tokenType string) *aggregate.AuthToken {
	return &aggregate.AuthToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "somehash",
		Type:      tokenType,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		UsedAt:    nil,
		CreatedAt: time.Now(),
	}
}

func (s *AuthServiceTestSuite) newUsedAuthToken(userID uuid.UUID, tokenType string) *aggregate.AuthToken {
	now := time.Now()
	return &aggregate.AuthToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "somehash",
		Type:      tokenType,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		UsedAt:    &now,
		CreatedAt: time.Now(),
	}
}

func (s *AuthServiceTestSuite) newExpiredAuthToken(userID uuid.UUID, tokenType string) *aggregate.AuthToken {
	return &aggregate.AuthToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: "somehash",
		Type:      tokenType,
		ExpiresAt: time.Now().Add(-1 * time.Hour),
		UsedAt:    nil,
		CreatedAt: time.Now(),
	}
}

// ===========================================================================
// Register
// ===========================================================================

func (s *AuthServiceTestSuite) TestRegister_Success_Admin() {
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrNotFound
	}
	s.userRepo.CreateFn = func(_ context.Context, _ *sql.Tx, user *userAggregate.User) (*userAggregate.User, error) {
		return user, nil
	}
	s.authTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, v *aggregate.AuthToken) (*aggregate.AuthToken, error) {
		return v, nil
	}

	var sentReq dtos.SendEmailRequest
	s.emailSender.SendFn = func(_ context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
		sentReq = req
		return &dtos.SendEmailResponse{ID: "test-id"}, nil
	}

	result, err := s.service.Register(s.ctx, "admin@uwi.edu", "P@ssword1", "admin")

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal("admin@uwi.edu", result.Email)
	s.Equal(userAggregate.Role_Admin, result.Role)
	s.True(result.IsActive)

	// Verify email was sent correctly
	s.Equal("email_verification", string(sentReq.Template.ID))
	s.Contains(sentReq.Template.Variables["VERIFICATION_URL"], "http://localhost:3000/verify-email?token=")
	s.Equal([]string{"admin@uwi.edu"}, sentReq.To)
}

func (s *AuthServiceTestSuite) TestRegister_Success_Student() {
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrNotFound
	}
	s.userRepo.CreateFn = func(_ context.Context, _ *sql.Tx, user *userAggregate.User) (*userAggregate.User, error) {
		return user, nil
	}
	s.authTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, v *aggregate.AuthToken) (*aggregate.AuthToken, error) {
		return v, nil
	}

	var sentReq dtos.SendEmailRequest
	s.emailSender.SendFn = func(_ context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
		sentReq = req
		return &dtos.SendEmailResponse{ID: "test-id"}, nil
	}

	result, err := s.service.Register(s.ctx, "student@my.uwi.edu", "P@ssword1", "student")

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal("student@my.uwi.edu", result.Email)
	s.Equal(userAggregate.Role_Student, result.Role)
	s.True(result.IsActive)

	// Verify email was sent correctly
	s.Equal("email_verification", string(sentReq.Template.ID))
	s.Contains(sentReq.Template.Variables["VERIFICATION_URL"], "http://localhost:3000/verify-email?token=")
	s.Equal([]string{"student@my.uwi.edu"}, sentReq.To)
}

func (s *AuthServiceTestSuite) TestRegister_EmailAlreadyExists() {
	existing := s.newVerifiedAdmin()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return existing, nil
	}

	result, err := s.service.Register(s.ctx, "admin@uwi.edu", "P@ssword1", "admin")

	s.ErrorIs(err, userErrors.ErrEmailAlreadyExists)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestRegister_InvalidEmail() {
	result, err := s.service.Register(s.ctx, "bad-email", "P@ssword1", "admin")

	s.Require().Error(err)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestRegister_InvalidRole() {
	result, err := s.service.Register(s.ctx, "admin@uwi.edu", "P@ssword1", "superuser")

	s.Require().Error(err)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestRegister_WeakPassword() {
	result, err := s.service.Register(s.ctx, "admin@uwi.edu", "abc", "admin")

	s.Require().Error(err)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestRegister_RoleEmailMismatch() {
	result, err := s.service.Register(s.ctx, "student@my.uwi.edu", "P@ssword1", "admin")

	s.Require().Error(err)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestRegister_SendEmailFails() {
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrNotFound
	}
	s.userRepo.CreateFn = func(_ context.Context, _ *sql.Tx, user *userAggregate.User) (*userAggregate.User, error) {
		return user, nil
	}
	s.authTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, v *aggregate.AuthToken) (*aggregate.AuthToken, error) {
		return v, nil
	}
	s.emailSender.SendFn = func(_ context.Context, _ dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
		return nil, errors.New("email service down")
	}

	result, err := s.service.Register(s.ctx, "admin@uwi.edu", "P@ssword1", "admin")

	s.ErrorIs(err, authErrors.ErrSendVerificationFailed)
	s.Nil(result)
}

// ===========================================================================
// Login
// ===========================================================================

func (s *AuthServiceTestSuite) TestLogin_Success_Admin() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.refreshTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, token *aggregate.RefreshToken) (*aggregate.RefreshToken, error) {
		token.ID = uuid.New()
		return token, nil
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "admin@uwi.edu", "P@ssword1")

	s.Require().NoError(err)
	s.NotEmpty(accessToken)
	s.NotEmpty(refreshToken)
}

func (s *AuthServiceTestSuite) TestLogin_Success_Student() {
	user := s.newVerifiedStudent()
	studentID := "12345"
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.userRepo.GetStudentIDByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*string, error) {
		return &studentID, nil
	}
	s.refreshTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, token *aggregate.RefreshToken) (*aggregate.RefreshToken, error) {
		token.ID = uuid.New()
		return token, nil
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "student@my.uwi.edu", "P@ssword1")

	s.Require().NoError(err)
	s.NotEmpty(accessToken)
	s.NotEmpty(refreshToken)
}

func (s *AuthServiceTestSuite) TestLogin_UserNotFound() {
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrNotFound
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "nobody@uwi.edu", "P@ssword1")

	s.ErrorIs(err, authErrors.ErrInvalidCredentials)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestLogin_WrongPassword() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "admin@uwi.edu", "WrongPass1")

	s.ErrorIs(err, authErrors.ErrInvalidCredentials)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestLogin_AccountInactive() {
	user := s.newInactiveUser()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "admin@uwi.edu", "P@ssword1")

	s.ErrorIs(err, authErrors.ErrAccountInactive)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestLogin_EmailNotVerified() {
	user := s.newUnverifiedUser()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "admin@uwi.edu", "P@ssword1")

	s.ErrorIs(err, authErrors.ErrEmailNotVerified)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestLogin_RefreshTokenCreateFails() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.refreshTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, _ *aggregate.RefreshToken) (*aggregate.RefreshToken, error) {
		return nil, errors.New("db write error")
	}

	accessToken, refreshToken, err := s.service.Login(s.ctx, "admin@uwi.edu", "P@ssword1")

	s.Require().Error(err)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

// ===========================================================================
// Refresh
// ===========================================================================

func (s *AuthServiceTestSuite) TestRefresh_Success() {
	user := s.newVerifiedAdmin()
	oldToken := s.newActiveRefreshToken(user.ID)

	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return oldToken, nil
	}
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.refreshTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, token *aggregate.RefreshToken) (*aggregate.RefreshToken, error) {
		token.ID = uuid.New()
		return token, nil
	}
	s.refreshTokenRepo.RevokeByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID, _ *uuid.UUID) error {
		return nil
	}

	accessToken, refreshToken, err := s.service.Refresh(s.ctx, "any-raw-token")

	s.Require().NoError(err)
	s.NotEmpty(accessToken)
	s.NotEmpty(refreshToken)
}

func (s *AuthServiceTestSuite) TestRefresh_TokenNotFound() {
	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return nil, authErrors.ErrInvalidRefreshToken
	}

	accessToken, refreshToken, err := s.service.Refresh(s.ctx, "nonexistent-token")

	s.ErrorIs(err, authErrors.ErrInvalidRefreshToken)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestRefresh_TokenRevoked_TheftDetection() {
	userID := uuid.New()
	revokedToken := s.newRevokedRefreshToken(userID)

	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return revokedToken, nil
	}
	s.refreshTokenRepo.RevokeAllByUserIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) error {
		s.Equal(userID, id)
		return nil
	}

	accessToken, refreshToken, err := s.service.Refresh(s.ctx, "reused-token")

	s.ErrorIs(err, authErrors.ErrTokenReuse)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestRefresh_TokenExpired() {
	userID := uuid.New()
	expiredToken := s.newExpiredRefreshToken(userID)

	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return expiredToken, nil
	}

	accessToken, refreshToken, err := s.service.Refresh(s.ctx, "expired-token")

	s.ErrorIs(err, authErrors.ErrRefreshTokenExpired)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

func (s *AuthServiceTestSuite) TestRefresh_GetUserFails() {
	userID := uuid.New()
	activeToken := s.newActiveRefreshToken(userID)

	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return activeToken, nil
	}
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, errors.New("db error")
	}

	accessToken, refreshToken, err := s.service.Refresh(s.ctx, "some-token")

	s.Require().Error(err)
	s.Empty(accessToken)
	s.Empty(refreshToken)
}

// ===========================================================================
// Logout
// ===========================================================================

func (s *AuthServiceTestSuite) TestLogout_Success() {
	userID := uuid.New()
	activeToken := s.newActiveRefreshToken(userID)

	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return activeToken, nil
	}
	s.refreshTokenRepo.RevokeByIDFn = func(_ context.Context, _ *sql.Tx, tokenID uuid.UUID, replacedBy *uuid.UUID) error {
		s.Equal(activeToken.ID, tokenID)
		s.Nil(replacedBy)
		return nil
	}

	err := s.service.Logout(s.ctx, "some-token")

	s.Require().NoError(err)
}

func (s *AuthServiceTestSuite) TestLogout_TokenNotFound() {
	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return nil, authErrors.ErrInvalidRefreshToken
	}

	err := s.service.Logout(s.ctx, "nonexistent-token")

	s.Require().NoError(err) // idempotent — returns nil
}

func (s *AuthServiceTestSuite) TestLogout_AlreadyRevoked() {
	userID := uuid.New()
	revokedToken := s.newRevokedRefreshToken(userID)

	s.refreshTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.RefreshToken, error) {
		return revokedToken, nil
	}

	err := s.service.Logout(s.ctx, "already-revoked-token")

	s.Require().NoError(err) // idempotent — returns nil
}

// ===========================================================================
// ChangePassword
// ===========================================================================

func (s *AuthServiceTestSuite) TestChangePassword_Success() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.userRepo.UpdateFn = func(_ context.Context, _ *sql.Tx, _ *userAggregate.User) error {
		return nil
	}
	s.refreshTokenRepo.RevokeAllByUserIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) error {
		return nil
	}

	err := s.service.ChangePassword(s.ctx, user.ID.String(), "P@ssword1", "NewP@ss1!")

	s.Require().NoError(err)
}

func (s *AuthServiceTestSuite) TestChangePassword_WrongCurrentPassword() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	err := s.service.ChangePassword(s.ctx, user.ID.String(), "WrongPass1", "NewP@ss1!")

	s.ErrorIs(err, authErrors.ErrPasswordMismatch)
}

func (s *AuthServiceTestSuite) TestChangePassword_SameAsOld() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	err := s.service.ChangePassword(s.ctx, user.ID.String(), "P@ssword1", "P@ssword1")

	s.ErrorIs(err, authErrors.ErrPasswordSameAsOld)
}

func (s *AuthServiceTestSuite) TestChangePassword_WeakNewPassword() {
	// ValidatePassword is called BEFORE InSystemTx, so no mock setup needed for repos
	err := s.service.ChangePassword(s.ctx, uuid.New().String(), "P@ssword1", "abc")

	s.Require().Error(err)
	s.ErrorIs(err, userErrors.ErrInvalidPasswordLength)
}

// ===========================================================================
// VerifyEmail
// ===========================================================================

func (s *AuthServiceTestSuite) TestVerifyEmail_Success() {
	user := s.newUnverifiedUser()
	verification := s.newValidAuthToken(user.ID, aggregate.AuthTokenType_EmailVerification)

	s.authTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string, _ string) (*aggregate.AuthToken, error) {
		return verification, nil
	}
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.userRepo.UpdateFn = func(_ context.Context, _ *sql.Tx, u *userAggregate.User) error {
		s.NotNil(u.EmailVerifiedAt)
		return nil
	}
	s.authTokenRepo.InvalidateAllByUserIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID, _ string) error {
		s.Equal(user.ID, id)
		return nil
	}

	err := s.service.VerifyEmail(s.ctx, "some-raw-token")

	s.Require().NoError(err)
}

func (s *AuthServiceTestSuite) TestVerifyEmail_TokenNotFound() {
	s.authTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string, _ string) (*aggregate.AuthToken, error) {
		return nil, authErrors.ErrVerificationTokenInvalid
	}

	err := s.service.VerifyEmail(s.ctx, "bad-token")

	s.ErrorIs(err, authErrors.ErrVerificationTokenInvalid)
}

func (s *AuthServiceTestSuite) TestVerifyEmail_TokenUsed() {
	userID := uuid.New()
	used := s.newUsedAuthToken(userID, aggregate.AuthTokenType_EmailVerification)

	s.authTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string, _ string) (*aggregate.AuthToken, error) {
		return used, nil
	}

	err := s.service.VerifyEmail(s.ctx, "used-token")

	s.ErrorIs(err, authErrors.ErrVerificationTokenUsed)
}

func (s *AuthServiceTestSuite) TestVerifyEmail_TokenExpired() {
	userID := uuid.New()
	expired := s.newExpiredAuthToken(userID, aggregate.AuthTokenType_EmailVerification)

	s.authTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string, _ string) (*aggregate.AuthToken, error) {
		return expired, nil
	}

	err := s.service.VerifyEmail(s.ctx, "expired-token")

	s.ErrorIs(err, authErrors.ErrVerificationTokenExpired)
}

func (s *AuthServiceTestSuite) TestVerifyEmail_AlreadyVerified() {
	user := s.newVerifiedAdmin() // already has EmailVerifiedAt set
	verification := s.newValidAuthToken(user.ID, aggregate.AuthTokenType_EmailVerification)

	s.authTokenRepo.GetByTokenHashFn = func(_ context.Context, _ *sql.Tx, _ string, _ string) (*aggregate.AuthToken, error) {
		return verification, nil
	}
	s.userRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	err := s.service.VerifyEmail(s.ctx, "some-token")

	s.ErrorIs(err, authErrors.ErrEmailAlreadyVerified)
}

// ===========================================================================
// ResendVerification
// ===========================================================================

func (s *AuthServiceTestSuite) TestResendVerification_Success() {
	user := s.newUnverifiedUser()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.authTokenRepo.InvalidateAllByUserIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID, _ string) error {
		return nil
	}
	s.authTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, v *aggregate.AuthToken) (*aggregate.AuthToken, error) {
		return v, nil
	}

	var sentReq dtos.SendEmailRequest
	s.emailSender.SendFn = func(_ context.Context, req dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
		sentReq = req
		return &dtos.SendEmailResponse{ID: "test-id"}, nil
	}

	err := s.service.ResendVerification(s.ctx, "admin@uwi.edu")

	s.Require().NoError(err)

	// Verify email was sent correctly
	s.Equal("email_verification", string(sentReq.Template.ID))
	s.Contains(sentReq.Template.Variables["VERIFICATION_URL"], "http://localhost:3000/verify-email?token=")
	s.Equal([]string{"admin@uwi.edu"}, sentReq.To)
}

func (s *AuthServiceTestSuite) TestResendVerification_UserNotFound() {
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrNotFound
	}

	err := s.service.ResendVerification(s.ctx, "nobody@uwi.edu")

	s.ErrorIs(err, userErrors.ErrNotFound)
}

func (s *AuthServiceTestSuite) TestResendVerification_AlreadyVerified() {
	user := s.newVerifiedAdmin()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}

	err := s.service.ResendVerification(s.ctx, "admin@uwi.edu")

	s.ErrorIs(err, authErrors.ErrEmailAlreadyVerified)
}

func (s *AuthServiceTestSuite) TestResendVerification_SendEmailFails() {
	user := s.newUnverifiedUser()
	s.userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return user, nil
	}
	s.authTokenRepo.InvalidateAllByUserIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID, _ string) error {
		return nil
	}
	s.authTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, v *aggregate.AuthToken) (*aggregate.AuthToken, error) {
		return v, nil
	}
	s.emailSender.SendFn = func(_ context.Context, _ dtos.SendEmailRequest) (*dtos.SendEmailResponse, error) {
		return nil, errors.New("email service down")
	}

	err := s.service.ResendVerification(s.ctx, "admin@uwi.edu")

	s.ErrorIs(err, authErrors.ErrSendVerificationFailed)
}

// ===========================================================================
// ValidateAccessToken
// ===========================================================================

func (s *AuthServiceTestSuite) TestValidateAccessToken_Success() {
	claims := service.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "helpdesk-api",
		},
		Role: "admin",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret-key-that-is-at-least-32-bytes!"))
	s.Require().NoError(err)

	result, err := s.service.ValidateAccessToken(tokenString)

	s.Require().NoError(err)
	s.Require().NotNil(result)
	s.Equal("user-123", result.Subject)
	s.Equal("admin", result.Role)
}

func (s *AuthServiceTestSuite) TestValidateAccessToken_InvalidToken() {
	result, err := s.service.ValidateAccessToken("garbage-string")

	s.ErrorIs(err, authErrors.ErrInvalidAccessToken)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestValidateAccessToken_ExpiredToken() {
	claims := service.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			Issuer:    "helpdesk-api",
		},
		Role: "admin",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("test-secret-key-that-is-at-least-32-bytes!"))
	s.Require().NoError(err)

	result, err := s.service.ValidateAccessToken(tokenString)

	s.ErrorIs(err, authErrors.ErrInvalidAccessToken)
	s.Nil(result)
}

func (s *AuthServiceTestSuite) TestValidateAccessToken_WrongSigningKey() {
	claims := service.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   "user-123",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "helpdesk-api",
		},
		Role: "admin",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte("different-secret-key-that-is-32-bytes!!"))
	s.Require().NoError(err)

	result, err := s.service.ValidateAccessToken(tokenString)

	s.ErrorIs(err, authErrors.ErrInvalidAccessToken)
	s.Nil(result)
}

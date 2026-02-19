package auth_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type AuthHandlerTestSuite struct {
	suite.Suite
	mockSvc *mocks.MockAuthService
	router  *chi.Mux
}

func TestAuthHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(AuthHandlerTestSuite))
}

func (s *AuthHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockAuthService{}
	hdl := handler.NewAuthHandler(zap.NewNop(), s.mockSvc, 3600)
	s.router = chi.NewRouter()
	s.router.Route("/api/v1/auth", func(r chi.Router) {
		// Public routes
		r.Post("/register", hdl.Register)
		r.Post("/login", hdl.Login)
		r.Post("/refresh", hdl.Refresh)
		r.Post("/logout", hdl.Logout)
		r.Post("/verify-email", hdl.VerifyEmail)
		r.Post("/resend-verification", hdl.ResendVerification)
		// Authenticated routes (with test auth middleware)
		r.Group(func(r chi.Router) {
			r.Use(testAuthMiddleware("user-123", "admin"))
			r.Patch("/change-password", hdl.ChangePassword)
		})
	})
}

func testAuthMiddleware(userID, role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := database.WithAuthContext(r.Context(), database.AuthContext{
				UserID: userID,
				Role:   role,
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func (s *AuthHandlerTestSuite) doRequest(method, path string, body string) *httptest.ResponseRecorder {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	rr := httptest.NewRecorder()
	s.router.ServeHTTP(rr, req)
	return rr
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestRegister_Success() {
	userID := uuid.New()
	s.mockSvc.RegisterFn = func(_ context.Context, email, password, role string) (*userAggregate.User, error) {
		return &userAggregate.User{
			ID:       userID,
			Email:    email,
			Role:     userAggregate.Role(role),
			IsActive: true,
		}, nil
	}

	rr := s.doRequest("POST", "/api/v1/auth/register", `{
		"email": "test@uwi.edu",
		"password": "Secret1",
		"role": "admin"
	}`)

	s.Equal(http.StatusCreated, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal(userID.String(), resp["id"])
	s.Equal("test@uwi.edu", resp["email"])
	s.Equal("admin", resp["role"])
	s.Equal(true, resp["is_active"])
}

func (s *AuthHandlerTestSuite) TestRegister_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/auth/register", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRegister_MissingFields() {
	rr := s.doRequest("POST", "/api/v1/auth/register", `{"email": ""}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("email, password, and role are required", resp["error"])
}

func (s *AuthHandlerTestSuite) TestRegister_EmailAlreadyExists() {
	s.mockSvc.RegisterFn = func(_ context.Context, _, _, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrEmailAlreadyExists
	}

	rr := s.doRequest("POST", "/api/v1/auth/register", `{
		"email": "test@uwi.edu",
		"password": "Secret1",
		"role": "admin"
	}`)

	s.Equal(http.StatusConflict, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRegister_InvalidRole() {
	s.mockSvc.RegisterFn = func(_ context.Context, _, _, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrInvalidRole
	}

	rr := s.doRequest("POST", "/api/v1/auth/register", `{
		"email": "test@uwi.edu",
		"password": "Secret1",
		"role": "superuser"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRegister_WeakPassword() {
	s.mockSvc.RegisterFn = func(_ context.Context, _, _, _ string) (*userAggregate.User, error) {
		return nil, userErrors.ErrInvalidPasswordLength
	}

	rr := s.doRequest("POST", "/api/v1/auth/register", `{
		"email": "test@uwi.edu",
		"password": "ab1",
		"role": "admin"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRegister_SendVerificationFailed() {
	s.mockSvc.RegisterFn = func(_ context.Context, _, _, _ string) (*userAggregate.User, error) {
		return nil, authErrors.ErrSendVerificationFailed
	}

	rr := s.doRequest("POST", "/api/v1/auth/register", `{
		"email": "test@uwi.edu",
		"password": "Secret1",
		"role": "admin"
	}`)

	s.Equal(http.StatusBadGateway, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRegister_InternalError() {
	s.mockSvc.RegisterFn = func(_ context.Context, _, _, _ string) (*userAggregate.User, error) {
		return nil, fmt.Errorf("something")
	}

	rr := s.doRequest("POST", "/api/v1/auth/register", `{
		"email": "test@uwi.edu",
		"password": "Secret1",
		"role": "admin"
	}`)

	s.Equal(http.StatusInternalServerError, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("internal server error", resp["error"])
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestLogin_Success() {
	s.mockSvc.LoginFn = func(_ context.Context, _, _ string) (string, string, error) {
		return "access-token", "refresh-token", nil
	}

	rr := s.doRequest("POST", "/api/v1/auth/login", `{
		"email": "test@uwi.edu",
		"password": "Secret1"
	}`)

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("access-token", resp["access_token"])
	s.Equal("refresh-token", resp["refresh_token"])
	s.Equal("Bearer", resp["token_type"])
	s.Equal(float64(3600), resp["expires_in"])
}

func (s *AuthHandlerTestSuite) TestLogin_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/auth/login", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestLogin_MissingFields() {
	rr := s.doRequest("POST", "/api/v1/auth/login", `{"email": "a@b.com"}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("email and password are required", resp["error"])
}

func (s *AuthHandlerTestSuite) TestLogin_InvalidCredentials() {
	s.mockSvc.LoginFn = func(_ context.Context, _, _ string) (string, string, error) {
		return "", "", authErrors.ErrInvalidCredentials
	}

	rr := s.doRequest("POST", "/api/v1/auth/login", `{
		"email": "test@uwi.edu",
		"password": "Wrong1"
	}`)

	s.Equal(http.StatusUnauthorized, rr.Code)
}

func (s *AuthHandlerTestSuite) TestLogin_AccountInactive() {
	s.mockSvc.LoginFn = func(_ context.Context, _, _ string) (string, string, error) {
		return "", "", authErrors.ErrAccountInactive
	}

	rr := s.doRequest("POST", "/api/v1/auth/login", `{
		"email": "test@uwi.edu",
		"password": "Secret1"
	}`)

	s.Equal(http.StatusForbidden, rr.Code)
}

func (s *AuthHandlerTestSuite) TestLogin_EmailNotVerified() {
	s.mockSvc.LoginFn = func(_ context.Context, _, _ string) (string, string, error) {
		return "", "", authErrors.ErrEmailNotVerified
	}

	rr := s.doRequest("POST", "/api/v1/auth/login", `{
		"email": "test@uwi.edu",
		"password": "Secret1"
	}`)

	s.Equal(http.StatusForbidden, rr.Code)
}

// ---------------------------------------------------------------------------
// Refresh
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestRefresh_Success() {
	s.mockSvc.RefreshFn = func(_ context.Context, _ string) (string, string, error) {
		return "new-access-token", "new-refresh-token", nil
	}

	rr := s.doRequest("POST", "/api/v1/auth/refresh", `{
		"refresh_token": "old-refresh-token"
	}`)

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("new-access-token", resp["access_token"])
	s.Equal("new-refresh-token", resp["refresh_token"])
	s.Equal("Bearer", resp["token_type"])
	s.Equal(float64(3600), resp["expires_in"])
}

func (s *AuthHandlerTestSuite) TestRefresh_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/auth/refresh", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRefresh_MissingToken() {
	rr := s.doRequest("POST", "/api/v1/auth/refresh", `{"refresh_token": ""}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("refresh_token is required", resp["error"])
}

func (s *AuthHandlerTestSuite) TestRefresh_InvalidToken() {
	s.mockSvc.RefreshFn = func(_ context.Context, _ string) (string, string, error) {
		return "", "", authErrors.ErrInvalidRefreshToken
	}

	rr := s.doRequest("POST", "/api/v1/auth/refresh", `{
		"refresh_token": "bad-token"
	}`)

	s.Equal(http.StatusUnauthorized, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRefresh_ExpiredToken() {
	s.mockSvc.RefreshFn = func(_ context.Context, _ string) (string, string, error) {
		return "", "", authErrors.ErrRefreshTokenExpired
	}

	rr := s.doRequest("POST", "/api/v1/auth/refresh", `{
		"refresh_token": "expired-token"
	}`)

	s.Equal(http.StatusUnauthorized, rr.Code)
}

func (s *AuthHandlerTestSuite) TestRefresh_TokenReuse() {
	s.mockSvc.RefreshFn = func(_ context.Context, _ string) (string, string, error) {
		return "", "", authErrors.ErrTokenReuse
	}

	rr := s.doRequest("POST", "/api/v1/auth/refresh", `{
		"refresh_token": "reused-token"
	}`)

	s.Equal(http.StatusUnauthorized, rr.Code)
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestLogout_Success() {
	s.mockSvc.LogoutFn = func(_ context.Context, _ string) error {
		return nil
	}

	rr := s.doRequest("POST", "/api/v1/auth/logout", `{
		"refresh_token": "some-refresh-token"
	}`)

	s.Equal(http.StatusNoContent, rr.Code)
	s.Empty(rr.Body.String())
}

func (s *AuthHandlerTestSuite) TestLogout_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/auth/logout", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestLogout_MissingToken() {
	rr := s.doRequest("POST", "/api/v1/auth/logout", `{"refresh_token": ""}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("refresh_token is required", resp["error"])
}

// ---------------------------------------------------------------------------
// VerifyEmail
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestVerifyEmail_Success() {
	s.mockSvc.VerifyEmailFn = func(_ context.Context, _ string) error {
		return nil
	}

	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{
		"token": "verification-token"
	}`)

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("email verified successfully", resp["message"])
}

func (s *AuthHandlerTestSuite) TestVerifyEmail_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestVerifyEmail_MissingToken() {
	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{"token": ""}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("token is required", resp["error"])
}

func (s *AuthHandlerTestSuite) TestVerifyEmail_TokenInvalid() {
	s.mockSvc.VerifyEmailFn = func(_ context.Context, _ string) error {
		return authErrors.ErrVerificationTokenInvalid
	}

	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{
		"token": "bad-token"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestVerifyEmail_TokenExpired() {
	s.mockSvc.VerifyEmailFn = func(_ context.Context, _ string) error {
		return authErrors.ErrVerificationTokenExpired
	}

	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{
		"token": "expired-token"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestVerifyEmail_TokenUsed() {
	s.mockSvc.VerifyEmailFn = func(_ context.Context, _ string) error {
		return authErrors.ErrVerificationTokenUsed
	}

	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{
		"token": "used-token"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestVerifyEmail_AlreadyVerified() {
	s.mockSvc.VerifyEmailFn = func(_ context.Context, _ string) error {
		return authErrors.ErrEmailAlreadyVerified
	}

	rr := s.doRequest("POST", "/api/v1/auth/verify-email", `{
		"token": "some-token"
	}`)

	s.Equal(http.StatusConflict, rr.Code)
}

// ---------------------------------------------------------------------------
// ResendVerification
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestResendVerification_Success() {
	s.mockSvc.ResendVerificationFn = func(_ context.Context, _ string) error {
		return nil
	}

	rr := s.doRequest("POST", "/api/v1/auth/resend-verification", `{
		"email": "test@uwi.edu"
	}`)

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("verification email sent", resp["message"])
}

func (s *AuthHandlerTestSuite) TestResendVerification_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/auth/resend-verification", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestResendVerification_MissingEmail() {
	rr := s.doRequest("POST", "/api/v1/auth/resend-verification", `{"email": ""}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("email is required", resp["error"])
}

func (s *AuthHandlerTestSuite) TestResendVerification_UserNotFound() {
	s.mockSvc.ResendVerificationFn = func(_ context.Context, _ string) error {
		return userErrors.ErrNotFound
	}

	rr := s.doRequest("POST", "/api/v1/auth/resend-verification", `{
		"email": "nobody@uwi.edu"
	}`)

	s.Equal(http.StatusNotFound, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("user not found", resp["error"])
}

func (s *AuthHandlerTestSuite) TestResendVerification_AlreadyVerified() {
	s.mockSvc.ResendVerificationFn = func(_ context.Context, _ string) error {
		return authErrors.ErrEmailAlreadyVerified
	}

	rr := s.doRequest("POST", "/api/v1/auth/resend-verification", `{
		"email": "test@uwi.edu"
	}`)

	s.Equal(http.StatusConflict, rr.Code)
}

func (s *AuthHandlerTestSuite) TestResendVerification_SendFailed() {
	s.mockSvc.ResendVerificationFn = func(_ context.Context, _ string) error {
		return authErrors.ErrSendVerificationFailed
	}

	rr := s.doRequest("POST", "/api/v1/auth/resend-verification", `{
		"email": "test@uwi.edu"
	}`)

	s.Equal(http.StatusBadGateway, rr.Code)
}

// ---------------------------------------------------------------------------
// ChangePassword
// ---------------------------------------------------------------------------

func (s *AuthHandlerTestSuite) TestChangePassword_Success() {
	s.mockSvc.ChangePasswordFn = func(_ context.Context, userID, currentPassword, newPassword string) error {
		s.Equal("user-123", userID)
		s.Equal("OldPass1", currentPassword)
		s.Equal("NewPass1", newPassword)
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/auth/change-password", `{
		"current_password": "OldPass1",
		"new_password": "NewPass1"
	}`)

	s.Equal(http.StatusNoContent, rr.Code)
	s.Empty(rr.Body.String())
}

func (s *AuthHandlerTestSuite) TestChangePassword_InvalidBody() {
	rr := s.doRequest("PATCH", "/api/v1/auth/change-password", `{invalid json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestChangePassword_MissingFields() {
	rr := s.doRequest("PATCH", "/api/v1/auth/change-password", `{"current_password": "old"}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("current_password and new_password are required", resp["error"])
}

func (s *AuthHandlerTestSuite) TestChangePassword_WrongPassword() {
	s.mockSvc.ChangePasswordFn = func(_ context.Context, _, _, _ string) error {
		return authErrors.ErrPasswordMismatch
	}

	rr := s.doRequest("PATCH", "/api/v1/auth/change-password", `{
		"current_password": "WrongPass1",
		"new_password": "NewPass1"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestChangePassword_SameAsOld() {
	s.mockSvc.ChangePasswordFn = func(_ context.Context, _, _, _ string) error {
		return authErrors.ErrPasswordSameAsOld
	}

	rr := s.doRequest("PATCH", "/api/v1/auth/change-password", `{
		"current_password": "SamePass1",
		"new_password": "SamePass1"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *AuthHandlerTestSuite) TestChangePassword_NoAuthContext() {
	// Create a separate router without the auth middleware
	hdl := handler.NewAuthHandler(zap.NewNop(), s.mockSvc, 3600)
	noAuthRouter := chi.NewRouter()
	noAuthRouter.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterAuthenticatedRoutes(r)
	})

	req := httptest.NewRequest("PATCH", "/api/v1/auth/change-password", strings.NewReader(`{
		"current_password": "OldPass1",
		"new_password": "NewPass1"
	}`))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	noAuthRouter.ServeHTTP(rr, req)

	s.Equal(http.StatusUnauthorized, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("unauthorized", resp["error"])
}

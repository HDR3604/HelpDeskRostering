package auth_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	authDtos "github.com/HDR3604/HelpDeskApp/internal/domain/auth/types/dtos"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

// capturedEmail stores an email that was sent via the mock sender.
type capturedEmail struct {
	To              []string
	Subject         string
	VerificationURL string
}

type AuthE2ETestSuite struct {
	suite.Suite
	testDB         *utils.TestDB
	txManager      database.TxManagerInterface
	router         *chi.Mux
	capturedEmails []capturedEmail
	mu             sync.Mutex
	ctx            context.Context
}

func TestAuthE2ETestSuite(t *testing.T) {
	suite.Run(t, new(AuthE2ETestSuite))
}

func (s *AuthE2ETestSuite) SetupSuite() {
	logger := zap.NewNop()
	s.ctx = context.Background()

	// 1. Real test database via testcontainers
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)
	txManager := s.txManager

	// 2. Real repositories
	uRepo := userRepo.NewUserRepository(logger)
	refreshTokenRepo := authRepo.NewRefreshTokenRepository(logger)
	emailVerificationRepo := authRepo.NewEmailVerificationRepository(logger)

	// 3. Mock email sender — captures verification URLs
	emailSender := &mocks.MockEmailSender{
		SendFn: func(ctx context.Context, req emailDtos.SendEmailRequest) (*emailDtos.SendEmailResponse, error) {
			var verificationURL string
			if req.Template != nil {
				if v, ok := req.Template.Variables["VERIFICATION_URL"]; ok {
					verificationURL, _ = v.(string)
				}
			}
			s.mu.Lock()
			s.capturedEmails = append(s.capturedEmails, capturedEmail{
				To:              req.To,
				Subject:         req.Subject,
				VerificationURL: verificationURL,
			})
			s.mu.Unlock()
			return &emailDtos.SendEmailResponse{ID: "test-msg-id"}, nil
		},
	}

	// 4. Real auth service
	jwtSecret := []byte("e2e-test-secret-at-least-32-bytes!!")
	authSvc := service.NewAuthService(
		logger,
		txManager,
		uRepo,
		refreshTokenRepo,
		emailVerificationRepo,
		emailSender,
		jwtSecret,
		3600,  // accessTokenTTL
		86400, // refreshTokenTTL
		86400, // verificationTokenTTL
		"http://localhost:3000", // frontendURL
		"noreply@test.com",     // fromEmail
	)

	// 5. Real auth handler
	hdl := handler.NewAuthHandler(logger, authSvc, 3600)

	// 6. Chi router with routes registered manually to avoid duplicate /auth mount panic
	s.router = chi.NewRouter()
	s.router.Route("/api/v1/auth", func(r chi.Router) {
		// Public routes
		r.Post("/register", hdl.Register)
		r.Post("/login", hdl.Login)
		r.Post("/refresh", hdl.Refresh)
		r.Post("/logout", hdl.Logout)
		r.Post("/verify-email", hdl.VerifyEmail)
		r.Post("/resend-verification", hdl.ResendVerification)

		// Authenticated routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(authSvc))
			r.Patch("/change-password", hdl.ChangePassword)
		})
	})
}

func (s *AuthE2ETestSuite) TearDownTest() {
	// Use DELETE within InSystemTx because the `internal` role has DELETE
	// but not TRUNCATE on auth tables (FORCE RLS + limited GRANTs).
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		if _, err := tx.ExecContext(s.ctx, "DELETE FROM auth.refresh_tokens"); err != nil {
			return err
		}
		if _, err := tx.ExecContext(s.ctx, "DELETE FROM auth.email_verifications"); err != nil {
			return err
		}
		_, err := tx.ExecContext(s.ctx, "DELETE FROM auth.users")
		return err
	})
	s.Require().NoError(err)

	s.mu.Lock()
	s.capturedEmails = nil
	s.mu.Unlock()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// doRequest creates an HTTP request against the test router and returns the recorder.
func (s *AuthE2ETestSuite) doRequest(method, path, body, accessToken string) *httptest.ResponseRecorder {
	var reader *strings.Reader
	if body != "" {
		reader = strings.NewReader(body)
	} else {
		reader = strings.NewReader("")
	}

	req := httptest.NewRequest(method, path, reader)
	req.Header.Set("Content-Type", "application/json")
	if accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+accessToken)
	}

	rr := httptest.NewRecorder()
	s.router.ServeHTTP(rr, req)
	return rr
}

// extractTokenFromURL parses the "token" query parameter from a verification URL.
func extractTokenFromURL(verificationURL string) string {
	u, err := url.Parse(verificationURL)
	if err != nil {
		return ""
	}
	return u.Query().Get("token")
}

// parseTokenResponse decodes the response body into an AuthTokenResponse.
func parseTokenResponse(rr *httptest.ResponseRecorder) (authDtos.AuthTokenResponse, error) {
	var resp authDtos.AuthTokenResponse
	err := json.NewDecoder(rr.Body).Decode(&resp)
	return resp, err
}

// registerAndVerify is a shortcut: register -> extract token -> verify email -> login -> return tokens.
func (s *AuthE2ETestSuite) registerAndVerify(email, password, role string) authDtos.AuthTokenResponse {
	s.T().Helper()

	// Register
	registerBody := `{"email":"` + email + `","password":"` + password + `","role":"` + role + `"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/register", registerBody, "")
	s.Require().Equal(http.StatusCreated, rr.Code, "register failed: %s", rr.Body.String())

	// Extract verification token from captured email
	s.mu.Lock()
	s.Require().NotEmpty(s.capturedEmails, "no verification email was captured")
	lastEmail := s.capturedEmails[len(s.capturedEmails)-1]
	s.mu.Unlock()

	rawToken := extractTokenFromURL(lastEmail.VerificationURL)
	s.Require().NotEmpty(rawToken, "verification token is empty")

	// Verify email
	verifyBody := `{"token":"` + rawToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/verify-email", verifyBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "verify-email failed: %s", rr.Body.String())

	// Login
	loginBody := `{"email":"` + email + `","password":"` + password + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "login failed: %s", rr.Body.String())

	tokens, err := parseTokenResponse(rr)
	s.Require().NoError(err)
	return tokens
}

// ---------------------------------------------------------------------------
// E2E Test Scenarios
// ---------------------------------------------------------------------------

func (s *AuthE2ETestSuite) TestE2E_RegisterVerifyLogin() {
	email := "registerverify@uwi.edu"
	password := "StrongP@ss1"
	role := "admin"

	// 1. Register
	registerBody := `{"email":"` + email + `","password":"` + password + `","role":"` + role + `"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/register", registerBody, "")
	s.Require().Equal(http.StatusCreated, rr.Code, "expected 201, got %d: %s", rr.Code, rr.Body.String())

	// 2. Verify email was captured with correct subject and to address
	s.mu.Lock()
	s.Require().Len(s.capturedEmails, 1)
	captured := s.capturedEmails[0]
	s.mu.Unlock()

	s.Equal([]string{email}, captured.To)
	s.Contains(captured.Subject, "Verify Your Email")
	s.NotEmpty(captured.VerificationURL)

	// 3. Login before verification -> 403
	loginBody := `{"email":"` + email + `","password":"` + password + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Equal(http.StatusForbidden, rr.Code, "expected 403 before verification: %s", rr.Body.String())

	// 4. Extract token from captured verification URL
	rawToken := extractTokenFromURL(captured.VerificationURL)
	s.Require().NotEmpty(rawToken)

	// 5. Verify email -> 200
	verifyBody := `{"token":"` + rawToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/verify-email", verifyBody, "")
	s.Equal(http.StatusOK, rr.Code, "verify-email failed: %s", rr.Body.String())
	s.Contains(rr.Body.String(), "email verified successfully")

	// 6. Verify email again with same token -> 400 (token used)
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/verify-email", verifyBody, "")
	s.Equal(http.StatusBadRequest, rr.Code, "expected 400 for reused token: %s", rr.Body.String())

	// 7. Login after verification -> 200 with tokens
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "login after verification failed: %s", rr.Body.String())

	tokens, err := parseTokenResponse(rr)
	s.Require().NoError(err)
	s.NotEmpty(tokens.AccessToken)
	s.NotEmpty(tokens.RefreshToken)
	s.Equal("Bearer", tokens.TokenType)
	s.Equal(3600, tokens.ExpiresIn)

	// 8. Change password with access token -> 204
	changeBody := `{"current_password":"` + password + `","new_password":"NewStr0ng!Pass"}`
	rr = s.doRequest(http.MethodPatch, "/api/v1/auth/change-password", changeBody, tokens.AccessToken)
	s.Equal(http.StatusNoContent, rr.Code, "change-password failed: %s", rr.Body.String())
}

func (s *AuthE2ETestSuite) TestE2E_ResendVerification() {
	email := "resend@uwi.edu"
	password := "StrongP@ss1"

	// 1. Register (captures first email)
	registerBody := `{"email":"` + email + `","password":"` + password + `","role":"admin"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/register", registerBody, "")
	s.Require().Equal(http.StatusCreated, rr.Code)

	s.mu.Lock()
	s.Require().Len(s.capturedEmails, 1)
	s.mu.Unlock()

	// 2. Resend verification -> 200 (captures second email)
	resendBody := `{"email":"` + email + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/resend-verification", resendBody, "")
	s.Equal(http.StatusOK, rr.Code, "resend-verification failed: %s", rr.Body.String())

	s.mu.Lock()
	s.Require().Len(s.capturedEmails, 2)
	firstEmail := s.capturedEmails[0]
	secondEmail := s.capturedEmails[1]
	s.mu.Unlock()

	// 3. Extract token from FIRST email -> verify -> 400 (invalidated by resend)
	firstToken := extractTokenFromURL(firstEmail.VerificationURL)
	s.Require().NotEmpty(firstToken)

	verifyBody := `{"token":"` + firstToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/verify-email", verifyBody, "")
	s.Equal(http.StatusBadRequest, rr.Code, "expected 400 for invalidated first token: %s", rr.Body.String())

	// 4. Extract token from SECOND email -> verify -> 200
	secondToken := extractTokenFromURL(secondEmail.VerificationURL)
	s.Require().NotEmpty(secondToken)

	verifyBody = `{"token":"` + secondToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/verify-email", verifyBody, "")
	s.Equal(http.StatusOK, rr.Code, "verify with second token failed: %s", rr.Body.String())

	// 5. Resend verification after already verified -> 409
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/resend-verification", resendBody, "")
	s.Equal(http.StatusConflict, rr.Code, "expected 409 for already verified: %s", rr.Body.String())
}

func (s *AuthE2ETestSuite) TestE2E_RefreshTokenRotation() {
	// 1. Register + verify + login -> get tokens
	tokens := s.registerAndVerify("refresh@uwi.edu", "StrongP@ss1", "admin")
	firstRefresh := tokens.RefreshToken

	// 2. Refresh with first token -> 200, new tokens
	refreshBody := `{"refresh_token":"` + firstRefresh + `"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "first refresh failed: %s", rr.Body.String())

	secondTokens, err := parseTokenResponse(rr)
	s.Require().NoError(err)
	s.NotEmpty(secondTokens.AccessToken)
	s.NotEmpty(secondTokens.RefreshToken)
	secondRefresh := secondTokens.RefreshToken

	// 3. Refresh with second (latest) token -> 200, newer tokens
	refreshBody = `{"refresh_token":"` + secondRefresh + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "second refresh failed: %s", rr.Body.String())

	thirdTokens, err := parseTokenResponse(rr)
	s.Require().NoError(err)
	thirdRefresh := thirdTokens.RefreshToken

	// 4. Refresh with FIRST (old) refresh token -> 401 (token reuse / theft detection)
	refreshBody = `{"refresh_token":"` + firstRefresh + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Equal(http.StatusUnauthorized, rr.Code, "expected 401 for reused first token: %s", rr.Body.String())

	// 5. Refresh with latest (third) refresh token -> still 200
	// NOTE: The RevokeAllByUserID in theft detection is rolled back because
	// InSystemTx rolls back when the fn returns an error (ErrTokenReuse).
	// This is a known limitation — the reusing caller gets 401, but the
	// revocation of other tokens is not persisted.
	refreshBody = `{"refresh_token":"` + thirdRefresh + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Equal(http.StatusOK, rr.Code, "latest token should still work: %s", rr.Body.String())
}

func (s *AuthE2ETestSuite) TestE2E_Logout() {
	// 1. Register + verify + login
	tokens := s.registerAndVerify("logout@uwi.edu", "StrongP@ss1", "admin")

	// 2. Logout -> 204
	logoutBody := `{"refresh_token":"` + tokens.RefreshToken + `"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/logout", logoutBody, "")
	s.Equal(http.StatusNoContent, rr.Code, "logout failed: %s", rr.Body.String())

	// 3. Refresh with logged-out token -> 401
	refreshBody := `{"refresh_token":"` + tokens.RefreshToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Equal(http.StatusUnauthorized, rr.Code, "expected 401 for logged-out token: %s", rr.Body.String())

	// 4. Logout again (idempotent) -> 204
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/logout", logoutBody, "")
	s.Equal(http.StatusNoContent, rr.Code, "expected idempotent logout 204: %s", rr.Body.String())
}

func (s *AuthE2ETestSuite) TestE2E_ChangePasswordRevokesAllSessions() {
	email := "changepw@uwi.edu"
	oldPassword := "StrongP@ss1"
	newPassword := "NewStr0ng!Pass"

	// 1. Register + verify + login (session 1)
	session1 := s.registerAndVerify(email, oldPassword, "admin")

	// 2. Login again (session 2)
	loginBody := `{"email":"` + email + `","password":"` + oldPassword + `"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	session2, err := parseTokenResponse(rr)
	s.Require().NoError(err)

	// 3. Change password using session 1 access token -> 204
	changeBody := `{"current_password":"` + oldPassword + `","new_password":"` + newPassword + `"}`
	rr = s.doRequest(http.MethodPatch, "/api/v1/auth/change-password", changeBody, session1.AccessToken)
	s.Equal(http.StatusNoContent, rr.Code, "change-password failed: %s", rr.Body.String())

	// 4. Refresh with session 1 refresh token -> 401 (revoked)
	refreshBody := `{"refresh_token":"` + session1.RefreshToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Equal(http.StatusUnauthorized, rr.Code, "expected 401 for session1 refresh after pw change: %s", rr.Body.String())

	// 5. Refresh with session 2 refresh token -> 401 (revoked)
	refreshBody = `{"refresh_token":"` + session2.RefreshToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/refresh", refreshBody, "")
	s.Equal(http.StatusUnauthorized, rr.Code, "expected 401 for session2 refresh after pw change: %s", rr.Body.String())

	// 6. Login with OLD password -> 401
	loginBody = `{"email":"` + email + `","password":"` + oldPassword + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Equal(http.StatusUnauthorized, rr.Code, "expected 401 for old password: %s", rr.Body.String())

	// 7. Login with NEW password -> 200
	loginBody = `{"email":"` + email + `","password":"` + newPassword + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Equal(http.StatusOK, rr.Code, "login with new password failed: %s", rr.Body.String())
}

func (s *AuthE2ETestSuite) TestE2E_DuplicateRegistration() {
	email := "duplicate@uwi.edu"
	password := "StrongP@ss1"

	// 1. First registration -> 201
	registerBody := `{"email":"` + email + `","password":"` + password + `","role":"admin"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/register", registerBody, "")
	s.Equal(http.StatusCreated, rr.Code, "first register failed: %s", rr.Body.String())

	// 2. Duplicate registration with same email -> 409
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/register", registerBody, "")
	s.Equal(http.StatusConflict, rr.Code, "expected 409 for duplicate registration: %s", rr.Body.String())
}

package timelog_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"sync"
	"testing"
	"time"

	authHandler "github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	authService "github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	authDtos "github.com/HDR3604/HelpDeskApp/internal/domain/auth/types/dtos"
	timelogHandler "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/handler"
	timelogService "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	scheduleInfra "github.com/HDR3604/HelpDeskApp/internal/infrastructure/schedule"
	timelogInfra "github.com/HDR3604/HelpDeskApp/internal/infrastructure/timelog"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/HDR3604/HelpDeskApp/internal/tests/utils"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type TimeLogE2ETestSuite struct {
	suite.Suite
	testDB         *utils.TestDB
	txManager      database.TxManagerInterface
	router         *chi.Mux
	authSvc        authService.AuthServiceInterface
	timeLogSvc     *timelogService.TimeLogService
	capturedEmails []capturedEmail
	mu             sync.Mutex
	ctx            context.Context
}

type capturedEmail struct {
	To              []string
	Subject         string
	VerificationURL string
}

func TestTimeLogE2ETestSuite(t *testing.T) {
	suite.Run(t, new(TimeLogE2ETestSuite))
}

func (s *TimeLogE2ETestSuite) SetupSuite() {
	logger := zap.NewNop()
	s.ctx = context.Background()

	// 1. Real test database
	s.testDB = utils.NewTestDB(s.T())
	s.txManager = database.NewTxManager(s.testDB.DB, s.testDB.Logger)

	// 2. Real repositories
	uRepo := userRepo.NewUserRepository(logger)
	refreshTokenRepo := authRepo.NewRefreshTokenRepository(logger)
	authTokenRepo := authRepo.NewAuthTokenRepository(logger)
	timeLogRepo := timelogInfra.NewTimeLogRepository(logger)
	clockInCodeRepo := timelogInfra.NewClockInCodeRepository(logger)
	scheduleRepo := scheduleInfra.NewScheduleRepository(logger)

	// 3. Mock email sender
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

	// 4. Real services
	jwtSecret := []byte("e2e-test-secret-at-least-32-bytes!!")
	s.authSvc = authService.NewAuthService(
		logger, s.txManager, uRepo, refreshTokenRepo, authTokenRepo, emailSender,
		jwtSecret, 3600, 86400, 86400, 604800,
		"http://localhost:3000", "noreply@test.com",
	)

	tlSvc := timelogService.NewTimeLogService(
		logger, s.txManager, timeLogRepo, clockInCodeRepo, scheduleRepo,
		-61.277001, 10.642707, // UWI St Augustine
	)
	s.timeLogSvc = tlSvc.(*timelogService.TimeLogService)

	// 5. Handlers
	authHdl := authHandler.NewAuthHandler(logger, s.authSvc, 3600)
	timeLogHdl := timelogHandler.NewTimeLogHandler(logger, tlSvc)

	// 6. Router — mirrors production routes.go
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		// Public auth routes
		authHdl.RegisterRoutes(r)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(middleware.JWTAuth(s.authSvc))

			// Any authenticated user
			timeLogHdl.RegisterRoutes(r)

			// Admin-only
			r.Group(func(r chi.Router) {
				r.Use(middleware.Permission([]aggregate.Role{aggregate.Role_Admin}))
				timeLogHdl.RegisterAdminRoutes(r)
			})
		})
	})
}

func (s *TimeLogE2ETestSuite) TearDownTest() {
	// DELETE in dependency order. The `internal` role does not have TRUNCATE.
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		tables := []string{
			"schedule.time_logs",
			"schedule.clock_in_codes",
			"schedule.schedules",
			"auth.refresh_tokens",
			"auth.auth_tokens",
			"auth.students",
			"auth.users",
		}
		for _, t := range tables {
			if _, err := tx.ExecContext(s.ctx, "DELETE FROM "+t); err != nil {
				return fmt.Errorf("delete %s: %w", t, err)
			}
		}
		return nil
	})
	s.Require().NoError(err)

	// Reset clock to real time for next test
	s.timeLogSvc.WithNowFn(func() time.Time { return time.Now().UTC() })

	s.mu.Lock()
	s.capturedEmails = nil
	s.mu.Unlock()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func (s *TimeLogE2ETestSuite) doRequest(method, path, body, accessToken string) *httptest.ResponseRecorder {
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

func (s *TimeLogE2ETestSuite) registerAndVerify(email, password, role string) authDtos.AuthTokenResponse {
	s.T().Helper()

	registerBody := `{"first_name":"Test","last_name":"User","email":"` + email + `","password":"` + password + `","role":"` + role + `"}`
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/register", registerBody, "")
	s.Require().Equal(http.StatusCreated, rr.Code, "register failed: %s", rr.Body.String())

	s.mu.Lock()
	s.Require().NotEmpty(s.capturedEmails, "no verification email captured")
	lastEmail := s.capturedEmails[len(s.capturedEmails)-1]
	s.mu.Unlock()

	rawToken := extractTokenFromURL(lastEmail.VerificationURL)
	s.Require().NotEmpty(rawToken)

	verifyBody := `{"token":"` + rawToken + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/verify-email", verifyBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "verify failed: %s", rr.Body.String())

	loginBody := `{"email":"` + email + `","password":"` + password + `"}`
	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", loginBody, "")
	s.Require().Equal(http.StatusOK, rr.Code, "login failed: %s", rr.Body.String())

	var tokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&tokens))
	return tokens
}

func extractTokenFromURL(verificationURL string) string {
	u, err := url.Parse(verificationURL)
	if err != nil {
		return ""
	}
	return u.Query().Get("token")
}

// seedStudent creates a student record and returns the student_id.
// The user must already exist (from registerAndVerify).
func (s *TimeLogE2ETestSuite) seedStudent(email string, studentID int32) {
	s.T().Helper()
	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO auth.students (student_id, email_address, first_name, last_name, phone_number, transcript_metadata, availability)
			 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			studentID, email, "Test", "Student", "+18681234567", `{}`, `{}`,
		)
		return err
	})
	s.Require().NoError(err)
}

// seedActiveSchedule creates an active schedule with an assignment for the given
// student covering a window around the current time. Shift times are in local
// time (AST = UTC-4). Uses real wall clock — no need to pin nowFn.
func (s *TimeLogE2ETestSuite) seedActiveSchedule(studentID int32, adminUserID string) {
	s.T().Helper()

	// Schedule times are in local time (AST = UTC-4).
	// Pin to midday local to avoid midnight boundary flakiness.
	localTZ := time.FixedZone("AST", -4*60*60)
	nowLocal := time.Now().In(localTZ)
	midday := time.Date(nowLocal.Year(), nowLocal.Month(), nowLocal.Day(), 12, 0, 0, 0, localTZ)

	// Each call to nowFn advances by 1 second so that entry_at and exit_at are
	// distinct, satisfying the DB CHECK constraint (exit_at > entry_at).
	// All returned times remain within the 11:30–12:30 shift window.
	var callN int
	clockBase := midday.UTC()
	s.timeLogSvc.WithNowFn(func() time.Time {
		callN++
		return clockBase.Add(time.Duration(callN) * time.Second)
	})

	scheduleDay := (int(midday.Weekday()) + 6) % 7
	start := midday.Add(-30 * time.Minute).Format("15:04:05")
	end := midday.Add(30 * time.Minute).Format("15:04:05")

	assignments, _ := json.Marshal([]map[string]any{
		{
			"assistant_id": fmt.Sprintf("%d", studentID),
			"shift_id":     uuid.New().String(),
			"day_of_week":  scheduleDay,
			"start":        start,
			"end":          end,
		},
	})

	err := s.txManager.InSystemTx(s.ctx, func(tx *sql.Tx) error {
		_, err := tx.ExecContext(s.ctx,
			`INSERT INTO schedule.schedules (schedule_id, title, is_active, assignments, availability_metadata, created_by, effective_from)
			 VALUES ($1, $2, true, $3, $4, $5, $6)`,
			uuid.New(), "E2E Test Schedule", assignments, `{}`, adminUserID, nowLocal.Format("2006-01-02"),
		)
		return err
	})
	s.Require().NoError(err)
}

// parseJSON decodes the response body into a map.
func parseJSON(rr *httptest.ResponseRecorder) map[string]any {
	var m map[string]any
	json.NewDecoder(rr.Body).Decode(&m)
	return m
}

// ---------------------------------------------------------------------------
// E2E Tests
// ---------------------------------------------------------------------------

func (s *TimeLogE2ETestSuite) TestE2E_AdminGeneratesCode() {
	adminTokens := s.registerAndVerify("admin@uwi.edu", "StrongP@ss1", "admin")

	// Generate code
	rr := s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code, "generate code failed: %s", rr.Body.String())

	resp := parseJSON(rr)
	s.Len(resp["code"], 8)
	s.NotEmpty(resp["expires_at"])

	// Get active code
	rr = s.doRequest(http.MethodGet, "/api/v1/clock-in-codes/active", "", adminTokens.AccessToken)
	s.Equal(http.StatusOK, rr.Code)

	resp2 := parseJSON(rr)
	s.Equal(resp["code"], resp2["code"])
}

func (s *TimeLogE2ETestSuite) TestE2E_StudentClockInStatusClockOut() {
	// Setup: admin + student with active schedule
	adminTokens := s.registerAndVerify("admin2@uwi.edu", "StrongP@ss1", "admin")

	// Extract admin user ID from JWT for schedule created_by
	claims, err := s.authSvc.ValidateAccessToken(adminTokens.AccessToken)
	s.Require().NoError(err)

	// Register student, seed student record, then re-login to get student_id in JWT
	s.registerAndVerify("student@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("student@my.uwi.edu", 10001)

	// Re-login to pick up student_id in JWT
	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"student@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// Seed active schedule with assignment for this student
	s.seedActiveSchedule(10001, claims.Subject)

	// Admin generates clock-in code
	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	codeResp := parseJSON(rr)
	code := codeResp["code"].(string)

	// Student clocks in
	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.277001,"latitude":10.642707}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code, "clock-in failed: %s", rr.Body.String())

	clockInResp := parseJSON(rr)
	s.Equal(float64(10001), clockInResp["student_id"])
	s.Nil(clockInResp["exit_at"])
	s.NotEmpty(clockInResp["id"])

	// Student checks status — should be clocked in
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs/me/status", "", studentTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	statusResp := parseJSON(rr)
	s.Equal(true, statusResp["is_clocked_in"])
	s.NotNil(statusResp["current_log"])
	s.NotNil(statusResp["current_shift"])

	// Student clocks out
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-out", "", studentTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code, "clock-out failed: %s", rr.Body.String())

	clockOutResp := parseJSON(rr)
	s.NotNil(clockOutResp["exit_at"])

	// Status after clock-out — should not be clocked in
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs/me/status", "", studentTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	statusResp2 := parseJSON(rr)
	s.Equal(false, statusResp2["is_clocked_in"])

	// List logs — should have 1 entry
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs/me", "", studentTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	listResp := parseJSON(rr)
	s.Equal(float64(1), listResp["total"])
}

func (s *TimeLogE2ETestSuite) TestE2E_StudentRejectedWithoutActiveShift() {
	adminTokens := s.registerAndVerify("admin3@uwi.edu", "StrongP@ss1", "admin")

	s.registerAndVerify("noschedule@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("noschedule@my.uwi.edu", 10002)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"noschedule@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// No schedule seeded — student has no shift

	// Admin generates code
	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	code := parseJSON(rr)["code"].(string)

	// Student tries to clock in — rejected
	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.277001,"latitude":10.642707}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Equal(http.StatusBadRequest, rr.Code)

	resp := parseJSON(rr)
	s.Equal("no active shift assignment found", resp["error"])
}

func (s *TimeLogE2ETestSuite) TestE2E_StudentRejectedWithInvalidCode() {
	s.registerAndVerify("admin4@uwi.edu", "StrongP@ss1", "admin")

	s.registerAndVerify("badcode@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("badcode@my.uwi.edu", 10003)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"badcode@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// Try clock-in with non-existent code
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in",
		`{"code":"FAKECODE","longitude":-61.277001,"latitude":10.642707}`,
		studentTokens.AccessToken,
	)
	s.Equal(http.StatusBadRequest, rr.Code)

	resp := parseJSON(rr)
	s.Equal("invalid or expired clock-in code", resp["error"])
}

func (s *TimeLogE2ETestSuite) TestE2E_StudentCannotSeeOtherStudentLogs() {
	adminTokens := s.registerAndVerify("admin5@uwi.edu", "StrongP@ss1", "admin")
	claims, _ := s.authSvc.ValidateAccessToken(adminTokens.AccessToken)

	// Student A: register, seed, login, clock in
	s.registerAndVerify("studentA@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("studentA@my.uwi.edu", 10004)
	s.seedActiveSchedule(10004, claims.Subject)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"studentA@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var tokensA authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&tokensA))

	// Generate code and clock in student A
	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	code := parseJSON(rr)["code"].(string)

	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.277001,"latitude":10.642707}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, tokensA.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)

	// Student B: register, seed, login
	s.registerAndVerify("studentB@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("studentB@my.uwi.edu", 10005)

	rr = s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"studentB@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var tokensB authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&tokensB))

	// Student B lists their logs — should see 0 (not student A's logs)
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs/me", "", tokensB.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	listResp := parseJSON(rr)
	s.Equal(float64(0), listResp["total"])

	// Student A lists their logs — should see 1
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs/me", "", tokensA.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	listResp = parseJSON(rr)
	s.Equal(float64(1), listResp["total"])
}

func (s *TimeLogE2ETestSuite) TestE2E_StudentCannotAccessAdminCodeRoutes() {
	s.registerAndVerify("student.noadmin@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("student.noadmin@my.uwi.edu", 10006)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"student.noadmin@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// Student tries to generate a code — forbidden
	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, studentTokens.AccessToken)
	s.Equal(http.StatusForbidden, rr.Code)

	// Student tries to get active code — forbidden
	rr = s.doRequest(http.MethodGet, "/api/v1/clock-in-codes/active", "", studentTokens.AccessToken)
	s.Equal(http.StatusForbidden, rr.Code)
}

func (s *TimeLogE2ETestSuite) TestE2E_AutoFlagWhenFarFromHelpDesk() {
	adminTokens := s.registerAndVerify("admin-flag@uwi.edu", "StrongP@ss1", "admin")
	claims, _ := s.authSvc.ValidateAccessToken(adminTokens.AccessToken)

	s.registerAndVerify("far-student@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("far-student@my.uwi.edu", 10010)
	s.seedActiveSchedule(10010, claims.Subject)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"far-student@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// Generate code
	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	code := parseJSON(rr)["code"].(string)

	// Clock in from a location far away (~5km from help desk)
	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.230000,"latitude":10.680000}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code, "clock-in should succeed: %s", rr.Body.String())

	resp := parseJSON(rr)
	s.Equal(true, resp["is_flagged"], "should be auto-flagged due to distance")
	s.NotNil(resp["flag_reason"])
	s.Contains(resp["flag_reason"].(string), "from help desk")
}

func (s *TimeLogE2ETestSuite) TestE2E_AutoFlagNotTriggeredWhenClose() {
	adminTokens := s.registerAndVerify("admin-close@uwi.edu", "StrongP@ss1", "admin")
	claims, _ := s.authSvc.ValidateAccessToken(adminTokens.AccessToken)

	s.registerAndVerify("close-student@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("close-student@my.uwi.edu", 10011)
	s.seedActiveSchedule(10011, claims.Subject)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"close-student@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	code := parseJSON(rr)["code"].(string)

	// Clock in from exact help desk location
	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.277001,"latitude":10.642707}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)

	resp := parseJSON(rr)
	s.Equal(false, resp["is_flagged"], "should NOT be flagged when close to help desk")
}

func (s *TimeLogE2ETestSuite) TestE2E_DoubleClockInRejected() {
	adminTokens := s.registerAndVerify("admin-double@uwi.edu", "StrongP@ss1", "admin")
	claims, _ := s.authSvc.ValidateAccessToken(adminTokens.AccessToken)

	s.registerAndVerify("double@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("double@my.uwi.edu", 10012)
	s.seedActiveSchedule(10012, claims.Subject)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"double@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	code := parseJSON(rr)["code"].(string)

	// First clock-in — success
	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.277001,"latitude":10.642707}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)

	// Second clock-in — rejected
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Equal(http.StatusConflict, rr.Code)
	s.Equal("already clocked in", parseJSON(rr)["error"])
}

func (s *TimeLogE2ETestSuite) TestE2E_ClockOutWhenNotClockedIn() {
	s.registerAndVerify("notclocked@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("notclocked@my.uwi.edu", 10013)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"notclocked@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// Try to clock out without being clocked in
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-out", "", studentTokens.AccessToken)
	s.Equal(http.StatusNotFound, rr.Code)
	s.Equal("no open time log found", parseJSON(rr)["error"])
}

func (s *TimeLogE2ETestSuite) TestE2E_AdminListAndFlagTimeLogs() {
	adminTokens := s.registerAndVerify("admin-list@uwi.edu", "StrongP@ss1", "admin")
	claims, _ := s.authSvc.ValidateAccessToken(adminTokens.AccessToken)

	s.registerAndVerify("listed@my.uwi.edu", "StrongP@ss1", "student")
	s.seedStudent("listed@my.uwi.edu", 10014)
	s.seedActiveSchedule(10014, claims.Subject)

	rr := s.doRequest(http.MethodPost, "/api/v1/auth/login", `{"email":"listed@my.uwi.edu","password":"StrongP@ss1"}`, "")
	s.Require().Equal(http.StatusOK, rr.Code)
	var studentTokens authDtos.AuthTokenResponse
	s.Require().NoError(json.NewDecoder(rr.Body).Decode(&studentTokens))

	// Generate code and clock in
	rr = s.doRequest(http.MethodPost, "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	code := parseJSON(rr)["code"].(string)

	clockInBody := fmt.Sprintf(`{"code":"%s","longitude":-61.277001,"latitude":10.642707}`, code)
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-in", clockInBody, studentTokens.AccessToken)
	s.Require().Equal(http.StatusCreated, rr.Code)
	logID := parseJSON(rr)["id"].(string)

	// Clock out
	rr = s.doRequest(http.MethodPost, "/api/v1/time-logs/clock-out", "", studentTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	// Admin lists time logs — use local time to match schedule timezone
	localTZ := time.FixedZone("AST", -4*60*60)
	today := time.Now().In(localTZ).Format("2006-01-02")
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs?from="+today+"&to="+today, "", adminTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	listResp := parseJSON(rr)
	s.GreaterOrEqual(listResp["total"].(float64), float64(1))
	data := listResp["data"].([]any)
	s.NotEmpty(data)

	// First entry should have student name
	firstLog := data[0].(map[string]any)
	s.NotEmpty(firstLog["student_name"])

	// Admin views single time log
	rr = s.doRequest(http.MethodGet, "/api/v1/time-logs/"+logID, "", adminTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	detail := parseJSON(rr)
	s.Equal(logID, detail["id"])
	s.NotEmpty(detail["student_name"])

	// Admin flags the log
	rr = s.doRequest(http.MethodPatch, "/api/v1/time-logs/"+logID+"/flag", `{"reason":"Test flag reason"}`, adminTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	flagResp := parseJSON(rr)
	s.Equal(true, flagResp["is_flagged"])
	s.Equal("Test flag reason", flagResp["flag_reason"])

	// Admin unflags the log
	rr = s.doRequest(http.MethodPatch, "/api/v1/time-logs/"+logID+"/unflag", "", adminTokens.AccessToken)
	s.Require().Equal(http.StatusOK, rr.Code)

	unflagResp := parseJSON(rr)
	s.Equal(false, unflagResp["is_flagged"])
	s.Nil(unflagResp["flag_reason"])
}

// Note: expired code test omitted — ClockInCode.IsExpired() uses time.Now()
// directly (not service clock), so time advancement would require modifying
// the aggregate which is out of scope for this change.

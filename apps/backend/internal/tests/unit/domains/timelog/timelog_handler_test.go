package timelog_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type TimeLogHandlerTestSuite struct {
	suite.Suite
	mockSvc *mocks.MockTimeLogService
	router  *chi.Mux
}

func TestTimeLogHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(TimeLogHandlerTestSuite))
}

func (s *TimeLogHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockTimeLogService{}
	hdl := handler.NewTimeLogHandler(zap.NewNop(), s.mockSvc)
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)
		hdl.RegisterAdminRoutes(r)
	})
}

func studentContext() *database.AuthContext {
	sid := "12345"
	return &database.AuthContext{
		UserID:    uuid.New().String(),
		StudentID: &sid,
		Role:      "student",
	}
}

func adminContext() *database.AuthContext {
	return &database.AuthContext{
		UserID: uuid.New().String(),
		Role:   "admin",
	}
}

func (s *TimeLogHandlerTestSuite) doRequest(method, path string, body string) *httptest.ResponseRecorder {
	return s.doRequestAs(method, path, body, studentContext())
}

func (s *TimeLogHandlerTestSuite) doRequestAs(method, path string, body string, ac *database.AuthContext) *httptest.ResponseRecorder {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	if ac != nil {
		req = req.WithContext(database.WithAuthContext(req.Context(), *ac))
	}
	rr := httptest.NewRecorder()
	s.router.ServeHTTP(rr, req)
	return rr
}

func sampleTimeLog() *aggregate.TimeLog {
	return &aggregate.TimeLog{
		ID:             uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		StudentID:      12345,
		EntryAt:        time.Date(2026, 3, 9, 9, 0, 0, 0, time.UTC),
		Longitude:      -61.277001,
		Latitude:       10.642707,
		DistanceMeters: 15.3,
		IsFlagged:      false,
		CreatedAt:      time.Date(2026, 3, 9, 9, 0, 0, 0, time.UTC),
	}
}

// --- ClockIn ---

func (s *TimeLogHandlerTestSuite) TestClockIn_Success() {
	s.mockSvc.ClockInFn = func(_ context.Context, input service.ClockInInput) (*aggregate.TimeLog, error) {
		s.Equal("A1B2C3D4", input.Code)
		s.Equal(-61.277001, input.Longitude)
		s.Equal(10.642707, input.Latitude)
		return sampleTimeLog(), nil
	}

	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `{
		"code": "A1B2C3D4",
		"longitude": -61.277001,
		"latitude": 10.642707
	}`)

	s.Equal(http.StatusCreated, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("11111111-1111-1111-1111-111111111111", resp["id"])
	s.Equal(float64(12345), resp["student_id"])
	s.Equal(float64(15.3), resp["distance_meters"])
}

func (s *TimeLogHandlerTestSuite) TestClockIn_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `not json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *TimeLogHandlerTestSuite) TestClockIn_EmptyCode() {
	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `{
		"code": "",
		"longitude": -61.277001,
		"latitude": 10.642707
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *TimeLogHandlerTestSuite) TestClockIn_ZeroCoordinates() {
	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `{
		"code": "A1B2C3D4",
		"longitude": 0,
		"latitude": 0
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("longitude and latitude are required", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestClockIn_InvalidCode() {
	s.mockSvc.ClockInFn = func(_ context.Context, _ service.ClockInInput) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrInvalidClockInCode
	}

	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `{
		"code": "BADCODE1",
		"longitude": -61.277001,
		"latitude": 10.642707
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("invalid or expired clock-in code", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestClockIn_AlreadyClockedIn() {
	s.mockSvc.ClockInFn = func(_ context.Context, _ service.ClockInInput) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrAlreadyClockedIn
	}

	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `{
		"code": "A1B2C3D4",
		"longitude": -61.277001,
		"latitude": 10.642707
	}`)

	s.Equal(http.StatusConflict, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("already clocked in", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestClockIn_NoActiveShift() {
	s.mockSvc.ClockInFn = func(_ context.Context, _ service.ClockInInput) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrNoActiveShift
	}

	rr := s.doRequest("POST", "/api/v1/time-logs/clock-in", `{
		"code": "A1B2C3D4",
		"longitude": -61.277001,
		"latitude": 10.642707
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

// --- ClockOut ---

func (s *TimeLogHandlerTestSuite) TestClockOut_Success() {
	tl := sampleTimeLog()
	exitAt := time.Date(2026, 3, 9, 10, 5, 0, 0, time.UTC)
	tl.ExitAt = &exitAt

	s.mockSvc.ClockOutFn = func(_ context.Context) (*aggregate.TimeLog, error) {
		return tl, nil
	}

	rr := s.doRequest("POST", "/api/v1/time-logs/clock-out", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.NotNil(resp["exit_at"])
}

func (s *TimeLogHandlerTestSuite) TestClockOut_NotClockedIn() {
	s.mockSvc.ClockOutFn = func(_ context.Context) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrNotClockedIn
	}

	rr := s.doRequest("POST", "/api/v1/time-logs/clock-out", "")

	s.Equal(http.StatusNotFound, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("no open time log found", resp["error"])
}

// --- GetMyStatus ---

func (s *TimeLogHandlerTestSuite) TestGetMyStatus_ClockedIn() {
	tl := sampleTimeLog()
	s.mockSvc.GetMyStatusFn = func(_ context.Context) (*service.ClockInStatus, error) {
		return &service.ClockInStatus{
			IsClockedIn: true,
			CurrentLog:  tl,
			CurrentShift: &service.ShiftInfo{
				ShiftID:   uuid.New().String(),
				Name:      "Monday 9:00-10:00",
				StartTime: "09:00:00",
				EndTime:   "10:00:00",
			},
		}, nil
	}

	rr := s.doRequest("GET", "/api/v1/time-logs/me/status", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal(true, resp["is_clocked_in"])
	s.NotNil(resp["current_log"])
	s.NotNil(resp["current_shift"])
}

func (s *TimeLogHandlerTestSuite) TestGetMyStatus_NotClockedIn() {
	s.mockSvc.GetMyStatusFn = func(_ context.Context) (*service.ClockInStatus, error) {
		return &service.ClockInStatus{
			IsClockedIn: false,
		}, nil
	}

	rr := s.doRequest("GET", "/api/v1/time-logs/me/status", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal(false, resp["is_clocked_in"])
	s.Nil(resp["current_log"])
}

// --- ListMyTimeLogs ---

func (s *TimeLogHandlerTestSuite) TestListMyTimeLogs_Success() {
	s.mockSvc.ListMyTimeLogsFn = func(_ context.Context, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error) {
		return []*aggregate.TimeLog{sampleTimeLog()}, 1, nil
	}

	rr := s.doRequest("GET", "/api/v1/time-logs/me", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	data := resp["data"].([]any)
	s.Len(data, 1)
	s.Equal(float64(1), resp["total"])
}

// --- GenerateClockInCode ---

func (s *TimeLogHandlerTestSuite) TestGenerateClockInCode_Success() {
	s.mockSvc.GenerateClockInCodeFn = func(_ context.Context, mins int) (*aggregate.ClockInCode, error) {
		s.Equal(60, mins)
		return &aggregate.ClockInCode{
			ID:        uuid.New(),
			Code:      "X1Y2Z3W4",
			ExpiresAt: time.Now().UTC().Add(60 * time.Minute),
			CreatedAt: time.Now().UTC(),
			CreatedBy: uuid.New(),
		}, nil
	}

	rr := s.doRequestAs("POST", "/api/v1/clock-in-codes", `{"expires_in_minutes": 60}`, adminContext())

	s.Equal(http.StatusCreated, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("X1Y2Z3W4", resp["code"])
}

// --- GetActiveCode ---

func (s *TimeLogHandlerTestSuite) TestGetActiveCode_Success() {
	s.mockSvc.GetActiveClockInCodeFn = func(_ context.Context) (*aggregate.ClockInCode, error) {
		return &aggregate.ClockInCode{
			ID:        uuid.New(),
			Code:      "ACTIVE01",
			ExpiresAt: time.Now().UTC().Add(30 * time.Minute),
			CreatedAt: time.Now().UTC(),
			CreatedBy: uuid.New(),
		}, nil
	}

	rr := s.doRequestAs("GET", "/api/v1/clock-in-codes/active", "", adminContext())

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("ACTIVE01", resp["code"])
}

func (s *TimeLogHandlerTestSuite) TestGetActiveCode_NoActive() {
	s.mockSvc.GetActiveClockInCodeFn = func(_ context.Context) (*aggregate.ClockInCode, error) {
		return nil, timelogErrors.ErrNoActiveClockInCode
	}

	rr := s.doRequestAs("GET", "/api/v1/clock-in-codes/active", "", adminContext())

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- Admin: ListTimeLogs ---

func sampleAdminTimeLog() *aggregate.AdminTimeLog {
	tl := sampleTimeLog()
	return &aggregate.AdminTimeLog{
		TimeLog:      *tl,
		StudentName:  "John Doe",
		StudentEmail: "john@example.com",
		StudentPhone: "555-1234",
	}
}

func (s *TimeLogHandlerTestSuite) TestListTimeLogs_Success() {
	atl := sampleAdminTimeLog()
	s.mockSvc.ListTimeLogsFn = func(_ context.Context, filter repository.TimeLogFilter) ([]*aggregate.AdminTimeLog, int, error) {
		s.Equal(1, filter.Page)
		s.Equal(50, filter.PerPage)
		return []*aggregate.AdminTimeLog{atl}, 1, nil
	}

	rr := s.doRequestAs("GET", "/api/v1/time-logs", "", adminContext())

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	data := resp["data"].([]any)
	s.Len(data, 1)
	s.Equal(float64(1), resp["total"])
	s.Equal(float64(1), resp["page"])
	s.Equal(float64(50), resp["per_page"])

	first := data[0].(map[string]any)
	s.Equal("11111111-1111-1111-1111-111111111111", first["id"])
	s.Equal("John Doe", first["student_name"])
	s.Equal("john@example.com", first["student_email"])
	s.Equal("555-1234", first["student_phone"])
}

func (s *TimeLogHandlerTestSuite) TestListTimeLogs_WithFilters() {
	s.mockSvc.ListTimeLogsFn = func(_ context.Context, filter repository.TimeLogFilter) ([]*aggregate.AdminTimeLog, int, error) {
		s.Equal(2, filter.Page)
		s.Equal(10, filter.PerPage)
		s.Require().NotNil(filter.StudentID)
		s.Equal(int32(999), *filter.StudentID)
		s.Require().NotNil(filter.From)
		s.Equal(time.Date(2026, 3, 1, 0, 0, 0, 0, time.UTC), *filter.From)
		s.Require().NotNil(filter.To)
		// "to" is made exclusive by adding one day
		s.Equal(time.Date(2026, 4, 1, 0, 0, 0, 0, time.UTC), *filter.To)
		s.Require().NotNil(filter.Flagged)
		s.True(*filter.Flagged)
		return []*aggregate.AdminTimeLog{}, 0, nil
	}

	rr := s.doRequestAs("GET", "/api/v1/time-logs?page=2&per_page=10&student_id=999&from=2026-03-01&to=2026-03-31&flagged=true", "", adminContext())

	s.Equal(http.StatusOK, rr.Code)
}

func (s *TimeLogHandlerTestSuite) TestListTimeLogs_Empty() {
	s.mockSvc.ListTimeLogsFn = func(_ context.Context, filter repository.TimeLogFilter) ([]*aggregate.AdminTimeLog, int, error) {
		return []*aggregate.AdminTimeLog{}, 0, nil
	}

	rr := s.doRequestAs("GET", "/api/v1/time-logs", "", adminContext())

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	data := resp["data"].([]any)
	s.Len(data, 0)
	s.Equal(float64(0), resp["total"])
}

func (s *TimeLogHandlerTestSuite) TestListTimeLogs_Forbidden() {
	s.mockSvc.ListTimeLogsFn = func(_ context.Context, _ repository.TimeLogFilter) ([]*aggregate.AdminTimeLog, int, error) {
		return nil, 0, timelogErrors.ErrNotAuthorized
	}

	rr := s.doRequest("GET", "/api/v1/time-logs", "")

	s.Equal(http.StatusForbidden, rr.Code)
}

// --- Admin: GetTimeLog ---

func (s *TimeLogHandlerTestSuite) TestGetTimeLog_Success() {
	atl := sampleAdminTimeLog()
	s.mockSvc.GetTimeLogFn = func(_ context.Context, id uuid.UUID) (*aggregate.AdminTimeLog, error) {
		s.Equal(uuid.MustParse("11111111-1111-1111-1111-111111111111"), id)
		return atl, nil
	}

	rr := s.doRequestAs("GET", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111", "", adminContext())

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("11111111-1111-1111-1111-111111111111", resp["id"])
	s.Equal("John Doe", resp["student_name"])
	s.Equal("john@example.com", resp["student_email"])
	s.Equal("555-1234", resp["student_phone"])
	s.Equal(float64(12345), resp["student_id"])
}

func (s *TimeLogHandlerTestSuite) TestGetTimeLog_InvalidID() {
	rr := s.doRequestAs("GET", "/api/v1/time-logs/not-a-uuid", "", adminContext())

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("invalid time log ID", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestGetTimeLog_NotFound() {
	s.mockSvc.GetTimeLogFn = func(_ context.Context, _ uuid.UUID) (*aggregate.AdminTimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	rr := s.doRequestAs("GET", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111", "", adminContext())

	s.Equal(http.StatusNotFound, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("time log not found", resp["error"])
}

// --- Admin: FlagTimeLog ---

func (s *TimeLogHandlerTestSuite) TestFlagTimeLog_Success() {
	tl := sampleTimeLog()
	reason := "suspicious distance"
	tl.IsFlagged = true
	tl.FlagReason = &reason

	s.mockSvc.FlagTimeLogFn = func(_ context.Context, id uuid.UUID, r string) (*aggregate.TimeLog, error) {
		s.Equal(uuid.MustParse("11111111-1111-1111-1111-111111111111"), id)
		s.Equal("suspicious distance", r)
		return tl, nil
	}

	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111/flag",
		`{"reason":"suspicious distance"}`, adminContext())

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal(true, resp["is_flagged"])
	s.Equal("suspicious distance", resp["flag_reason"])
}

func (s *TimeLogHandlerTestSuite) TestFlagTimeLog_EmptyReason() {
	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111/flag",
		`{"reason":""}`, adminContext())

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("reason is required", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestFlagTimeLog_InvalidBody() {
	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111/flag",
		`not json`, adminContext())

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *TimeLogHandlerTestSuite) TestFlagTimeLog_InvalidID() {
	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/not-a-uuid/flag",
		`{"reason":"test"}`, adminContext())

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("invalid time log ID", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestFlagTimeLog_NotFound() {
	s.mockSvc.FlagTimeLogFn = func(_ context.Context, _ uuid.UUID, _ string) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111/flag",
		`{"reason":"suspicious"}`, adminContext())

	s.Equal(http.StatusNotFound, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("time log not found", resp["error"])
}

// --- Admin: UnflagTimeLog ---

func (s *TimeLogHandlerTestSuite) TestUnflagTimeLog_Success() {
	tl := sampleTimeLog()
	tl.IsFlagged = false
	tl.FlagReason = nil

	s.mockSvc.UnflagTimeLogFn = func(_ context.Context, id uuid.UUID) (*aggregate.TimeLog, error) {
		s.Equal(uuid.MustParse("11111111-1111-1111-1111-111111111111"), id)
		return tl, nil
	}

	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111/unflag", "", adminContext())

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal(false, resp["is_flagged"])
	s.Nil(resp["flag_reason"])
}

func (s *TimeLogHandlerTestSuite) TestUnflagTimeLog_InvalidID() {
	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/not-a-uuid/unflag", "", adminContext())

	s.Equal(http.StatusBadRequest, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("invalid time log ID", resp["error"])
}

func (s *TimeLogHandlerTestSuite) TestUnflagTimeLog_NotFound() {
	s.mockSvc.UnflagTimeLogFn = func(_ context.Context, _ uuid.UUID) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	rr := s.doRequestAs("PATCH", "/api/v1/time-logs/11111111-1111-1111-1111-111111111111/unflag", "", adminContext())

	s.Equal(http.StatusNotFound, rr.Code)

	var resp map[string]string
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("time log not found", resp["error"])
}

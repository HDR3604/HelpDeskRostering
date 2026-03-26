package schedule_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	studentAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	transcriptTypes "github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"
	"github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ScheduleHandlerTestSuite struct {
	suite.Suite
	mockSvc        *mocks.MockScheduleService
	mockStudentSvc *mocks.MockStudentService
	router         *chi.Mux
}

func TestScheduleHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleHandlerTestSuite))
}

func (s *ScheduleHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockScheduleService{}
	s.mockStudentSvc = &mocks.MockStudentService{}
	hdl := handler.NewScheduleHandler(zap.NewNop(), s.mockSvc, s.mockStudentSvc, nil, nil, nil, "")
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		// Admin-only routes (behind permission middleware)
		r.Group(func(r chi.Router) {
			r.Use(middleware.Permission([]userAggregate.Role{userAggregate.Role_Admin}))
			hdl.RegisterAdminRoutes(r)
		})

		// Authenticated routes (any role)
		hdl.RegisterRoutes(r)
	})
}

func testStudent() *studentAggregate.Student {
	return &studentAggregate.Student{
		StudentID:    100,
		EmailAddress: "test@example.com",
		FirstName:    "Test",
		LastName:     "Student",
		PhoneNumber:  "1234567890",
		Availability: studentAggregate.Availability{"1": {8, 9, 10, 11}},
		TranscriptMetadata: transcriptTypes.TranscriptMetadata{
			Courses: []transcriptTypes.CourseResult{{Code: "CS101"}},
		},
		MinWeeklyHours: 4,
	}
}

// adminContext returns an AuthContext with admin role for injecting into test requests.
func adminContext() *database.AuthContext {
	return &database.AuthContext{
		UserID: "22222222-2222-2222-2222-222222222222",
		Role:   string(userAggregate.Role_Admin),
	}
}

func (s *ScheduleHandlerTestSuite) doRequest(method, path string, body string) *httptest.ResponseRecorder {
	return s.doRequestAs(method, path, body, adminContext())
}

func (s *ScheduleHandlerTestSuite) doRequestAs(method, path string, body string, ac *database.AuthContext) *httptest.ResponseRecorder {
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

func (s *ScheduleHandlerTestSuite) sampleSchedule() *aggregate.Schedule {
	return &aggregate.Schedule{
		ScheduleID:           uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Title:                "Fall 2025",
		IsActive:             false,
		Assignments:          json.RawMessage(`[]`),
		AvailabilityMetadata: json.RawMessage(`{}`),
		CreatedAt:            time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedBy:            uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		EffectiveFrom:        time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
	}
}

// --- Create ---

func (s *ScheduleHandlerTestSuite) TestCreate_Success() {
	s.mockSvc.CreateFn = func(_ context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
		schedule.CreatedAt = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
		schedule.CreatedBy = uuid.MustParse("22222222-2222-2222-2222-222222222222")
		return schedule, nil
	}

	rr := s.doRequest("POST", "/api/v1/schedules", `{
		"title": "Fall 2025",
		"effective_from": "2025-09-01",
		"effective_to": "2025-12-31"
	}`)

	s.Equal(http.StatusCreated, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Fall 2025", resp["title"])
	s.Equal("2025-09-01", resp["effective_from"])
}

func (s *ScheduleHandlerTestSuite) TestCreate_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/schedules", `not json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestCreate_InvalidDateFormat() {
	rr := s.doRequest("POST", "/api/v1/schedules", `{
		"title": "Test",
		"effective_from": "September 1st 2025"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestCreate_EmptyTitle() {
	rr := s.doRequest("POST", "/api/v1/schedules", `{
		"title": "",
		"effective_from": "2025-09-01"
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestCreate_Unauthorized() {
	rr := s.doRequestAs("POST", "/api/v1/schedules", `{
		"title": "Test",
		"effective_from": "2025-09-01"
	}`, nil)

	s.Equal(http.StatusForbidden, rr.Code)
}

// --- GetByID ---

func (s *ScheduleHandlerTestSuite) TestGetByID_Success() {
	expected := s.sampleSchedule()
	s.mockSvc.GetByIDFn = func(_ context.Context, id uuid.UUID) (*aggregate.Schedule, error) {
		s.Equal(expected.ScheduleID, id)
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedules/11111111-1111-1111-1111-111111111111", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Fall 2025", resp["title"])
}

func (s *ScheduleHandlerTestSuite) TestGetByID_InvalidUUID() {
	rr := s.doRequest("GET", "/api/v1/schedules/not-a-uuid", "")

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGetByID_NotFound() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.Schedule, error) {
		return nil, scheduleErrors.ErrNotFound
	}

	rr := s.doRequest("GET", "/api/v1/schedules/11111111-1111-1111-1111-111111111111", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- List ---

func (s *ScheduleHandlerTestSuite) TestList_Success() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.Schedule, error) {
		return []*aggregate.Schedule{s.sampleSchedule()}, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedules", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Len(resp, 1)
}

func (s *ScheduleHandlerTestSuite) TestList_Empty() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.Schedule, error) {
		return []*aggregate.Schedule{}, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedules", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Empty(resp)
}

// --- ListArchived ---

func (s *ScheduleHandlerTestSuite) TestListArchived_Success() {
	s.mockSvc.ListArchivedFn = func(_ context.Context) ([]*aggregate.Schedule, error) {
		return []*aggregate.Schedule{s.sampleSchedule()}, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedules/archived", "")

	s.Equal(http.StatusOK, rr.Code)
}

// --- Archive ---

func (s *ScheduleHandlerTestSuite) TestArchive_Success() {
	s.mockSvc.ArchiveFn = func(_ context.Context, id uuid.UUID) error {
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/schedules/11111111-1111-1111-1111-111111111111/archive", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestArchive_NotFound() {
	s.mockSvc.ArchiveFn = func(_ context.Context, _ uuid.UUID) error {
		return scheduleErrors.ErrNotFound
	}

	rr := s.doRequest("PATCH", "/api/v1/schedules/11111111-1111-1111-1111-111111111111/archive", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestArchive_InvalidID() {
	rr := s.doRequest("PATCH", "/api/v1/schedules/bad-id/archive", "")

	s.Equal(http.StatusBadRequest, rr.Code)
}

// --- Unarchive ---

func (s *ScheduleHandlerTestSuite) TestUnarchive_Success() {
	s.mockSvc.UnarchiveFn = func(_ context.Context, _ uuid.UUID) error {
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/schedules/11111111-1111-1111-1111-111111111111/unarchive", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

// --- Activate ---

func (s *ScheduleHandlerTestSuite) TestActivate_Success() {
	s.mockSvc.ActivateFn = func(_ context.Context, _ uuid.UUID) error {
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/schedules/11111111-1111-1111-1111-111111111111/activate", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

// --- Deactivate ---

func (s *ScheduleHandlerTestSuite) TestDeactivate_Success() {
	s.mockSvc.DeactivateFn = func(_ context.Context, _ uuid.UUID) error {
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/schedules/11111111-1111-1111-1111-111111111111/deactivate", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

// --- Internal Server Error ---

func (s *ScheduleHandlerTestSuite) TestList_InternalError() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.Schedule, error) {
		return nil, context.DeadlineExceeded
	}

	rr := s.doRequest("GET", "/api/v1/schedules", "")

	s.Equal(http.StatusInternalServerError, rr.Code)
}

// --- GenerateSchedule ---

func (s *ScheduleHandlerTestSuite) generatedSchedule() *aggregate.Schedule {
	genID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	metadata := `{"solver_status_code":2}`
	return &aggregate.Schedule{
		ScheduleID:           uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Title:                "Generated Schedule",
		IsActive:             false,
		Assignments:          json.RawMessage(`[{"assistant_id":"a1","shift_id":"s1","day_of_week":1,"start":"08:00:00","end":"12:00:00"}]`),
		AvailabilityMetadata: json.RawMessage(`{}`),
		CreatedAt:            time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedBy:            uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		EffectiveFrom:        time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
		GenerationID:         &genID,
		SchedulerMetadata:    &metadata,
	}
}

func (s *ScheduleHandlerTestSuite) setupStudentMock() {
	s.mockStudentSvc.GetByIDFn = func(_ context.Context, studentID int32) (*studentAggregate.Student, error) {
		if studentID == 100 {
			return testStudent(), nil
		}
		return nil, context.DeadlineExceeded
	}
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_Success() {
	s.setupStudentMock()
	genID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	s.mockSvc.GenerateScheduleFn = func(_ context.Context, params service.GenerateScheduleParams) (*aggregate.ScheduleGeneration, error) {
		s.Equal("Generated Schedule", params.Title)
		s.Equal("2025-09-01", params.EffectiveFrom.Format("2006-01-02"))
		s.Len(params.Assistants, 1)
		s.Equal("100", params.Assistants[0].ID)
		return &aggregate.ScheduleGeneration{
			ID:        genID,
			ConfigID:  params.ConfigID,
			Status:    aggregate.GenerationStatus_Pending,
			CreatedBy: uuid.MustParse("22222222-2222-2222-2222-222222222222"),
			CreatedAt: time.Now(),
		}, nil
	}

	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Generated Schedule",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusAccepted, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("33333333-3333-3333-3333-333333333333", resp["id"])
	s.Equal("pending", resp["status"])
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/schedules/generate", `not json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_EmptyStudentIDs() {
	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": []
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_InvalidConfigID() {
	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "not-a-uuid",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_InvalidDateFormat() {
	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "Sept 1",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_SchedulerUnavailable() {
	s.setupStudentMock()
	s.mockSvc.GenerateScheduleFn = func(_ context.Context, _ service.GenerateScheduleParams) (*aggregate.ScheduleGeneration, error) {
		return nil, schedulerErrors.ErrSchedulerUnavailable
	}

	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusBadGateway, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_Infeasible() {
	s.setupStudentMock()
	s.mockSvc.GenerateScheduleFn = func(_ context.Context, _ service.GenerateScheduleParams) (*aggregate.ScheduleGeneration, error) {
		return nil, schedulerErrors.ErrInfeasible
	}

	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusUnprocessableEntity, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_Unauthorized() {
	rr := s.doRequestAs("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`, nil)

	s.Equal(http.StatusForbidden, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_NoActiveShiftTemplates() {
	s.setupStudentMock()
	s.mockSvc.GenerateScheduleFn = func(_ context.Context, _ service.GenerateScheduleParams) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrNoActiveShiftTemplates
	}

	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusUnprocessableEntity, rr.Code)
}

func (s *ScheduleHandlerTestSuite) TestGenerateSchedule_ConfigNotFound() {
	s.setupStudentMock()
	s.mockSvc.GenerateScheduleFn = func(_ context.Context, _ service.GenerateScheduleParams) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	rr := s.doRequest("POST", "/api/v1/schedules/generate", `{
		"config_id": "44444444-4444-4444-4444-444444444444",
		"title": "Test",
		"effective_from": "2025-09-01",
		"student_ids": ["100"]
	}`)

	s.Equal(http.StatusNotFound, rr.Code)
}

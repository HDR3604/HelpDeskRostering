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
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ShiftTemplateHandlerTestSuite struct {
	suite.Suite
	mockSvc *mocks.MockShiftTemplateService
	router  *chi.Mux
}

func TestShiftTemplateHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(ShiftTemplateHandlerTestSuite))
}

func (s *ShiftTemplateHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockShiftTemplateService{}
	hdl := handler.NewShiftTemplateHandler(zap.NewNop(), s.mockSvc)
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)
	})
}

func (s *ShiftTemplateHandlerTestSuite) doRequest(method, path string, body string) *httptest.ResponseRecorder {
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

func (s *ShiftTemplateHandlerTestSuite) sampleShiftTemplate() *aggregate.ShiftTemplate {
	maxStaff := int32(3)
	return &aggregate.ShiftTemplate{
		ID:        uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Name:      "Monday 9-10am",
		DayOfWeek: 0,
		StartTime: time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC),
		EndTime:   time.Date(0, 1, 1, 10, 0, 0, 0, time.UTC),
		MinStaff:  2,
		MaxStaff:  &maxStaff,
		CourseDemands: []aggregate.CourseDemand{
			{CourseCode: "CS101", TutorsRequired: 1, Weight: 1.0},
		},
		IsActive:  true,
		CreatedAt: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

// --- Create ---

func (s *ShiftTemplateHandlerTestSuite) TestCreate_Success() {
	s.mockSvc.CreateFn = func(_ context.Context, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
		t.CreatedAt = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
		return t, nil
	}

	rr := s.doRequest("POST", "/api/v1/shift-templates", `{
		"name": "Monday 9-10am",
		"day_of_week": 0,
		"start_time": "09:00",
		"end_time": "10:00",
		"min_staff": 2,
		"max_staff": 3,
		"course_demands": [{"course_code": "CS101", "tutors_required": 1, "weight": 1.0}]
	}`)

	s.Equal(http.StatusCreated, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Monday 9-10am", resp["name"])
	s.Equal("09:00", resp["start_time"])
	s.Equal("10:00", resp["end_time"])
	s.Equal(float64(0), resp["day_of_week"])
	s.Equal(float64(2), resp["min_staff"])
	s.Equal(float64(3), resp["max_staff"])
	s.Equal(true, resp["is_active"])
}

func (s *ShiftTemplateHandlerTestSuite) TestCreate_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/shift-templates", `not json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ShiftTemplateHandlerTestSuite) TestCreate_InvalidStartTime() {
	rr := s.doRequest("POST", "/api/v1/shift-templates", `{
		"name": "Monday 9-10am",
		"day_of_week": 0,
		"start_time": "nine o'clock",
		"end_time": "10:00",
		"min_staff": 2
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ShiftTemplateHandlerTestSuite) TestCreate_ValidationError() {
	rr := s.doRequest("POST", "/api/v1/shift-templates", `{
		"name": "",
		"day_of_week": 0,
		"start_time": "09:00",
		"end_time": "10:00",
		"min_staff": 2
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ShiftTemplateHandlerTestSuite) TestCreate_Unauthorized() {
	s.mockSvc.CreateFn = func(_ context.Context, _ *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
		return nil, scheduleErrors.ErrMissingAuthContext
	}

	rr := s.doRequest("POST", "/api/v1/shift-templates", `{
		"name": "Monday 9-10am",
		"day_of_week": 0,
		"start_time": "09:00",
		"end_time": "10:00",
		"min_staff": 2
	}`)

	s.Equal(http.StatusUnauthorized, rr.Code)
}

// --- GetByID ---

func (s *ShiftTemplateHandlerTestSuite) TestGetByID_Success() {
	expected := s.sampleShiftTemplate()
	s.mockSvc.GetByIDFn = func(_ context.Context, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Monday 9-10am", resp["name"])
	s.Equal("09:00", resp["start_time"])
	s.Equal("10:00", resp["end_time"])
}

func (s *ShiftTemplateHandlerTestSuite) TestGetByID_InvalidID() {
	rr := s.doRequest("GET", "/api/v1/shift-templates/not-a-uuid", "")

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ShiftTemplateHandlerTestSuite) TestGetByID_NotFound() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ShiftTemplate, error) {
		return nil, scheduleErrors.ErrShiftTemplateNotFound
	}

	rr := s.doRequest("GET", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- List ---

func (s *ShiftTemplateHandlerTestSuite) TestList_Success() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{s.sampleShiftTemplate()}, nil
	}

	rr := s.doRequest("GET", "/api/v1/shift-templates", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Len(resp, 1)
}

func (s *ShiftTemplateHandlerTestSuite) TestList_Empty() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{}, nil
	}

	rr := s.doRequest("GET", "/api/v1/shift-templates", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Empty(resp)
}

// --- ListAll ---

func (s *ShiftTemplateHandlerTestSuite) TestListAll_Success() {
	s.mockSvc.ListAllFn = func(_ context.Context) ([]*aggregate.ShiftTemplate, error) {
		return []*aggregate.ShiftTemplate{s.sampleShiftTemplate()}, nil
	}

	rr := s.doRequest("GET", "/api/v1/shift-templates/all", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Len(resp, 1)
}

// --- Update ---

func (s *ShiftTemplateHandlerTestSuite) TestUpdate_Success() {
	expected := s.sampleShiftTemplate()
	s.mockSvc.UpdateFn = func(_ context.Context, id uuid.UUID, params service.UpdateShiftTemplateParams) (*aggregate.ShiftTemplate, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	rr := s.doRequest("PUT", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111", `{
		"name": "Monday 9-10am",
		"day_of_week": 0,
		"start_time": "09:00",
		"end_time": "10:00",
		"min_staff": 2,
		"max_staff": 3,
		"course_demands": [{"course_code": "CS101", "tutors_required": 1, "weight": 1.0}]
	}`)

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Monday 9-10am", resp["name"])
}

func (s *ShiftTemplateHandlerTestSuite) TestUpdate_InvalidID() {
	rr := s.doRequest("PUT", "/api/v1/shift-templates/bad-id", `{
		"name": "Monday 9-10am",
		"day_of_week": 0,
		"start_time": "09:00",
		"end_time": "10:00",
		"min_staff": 2
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ShiftTemplateHandlerTestSuite) TestUpdate_NotFound() {
	s.mockSvc.UpdateFn = func(_ context.Context, _ uuid.UUID, _ service.UpdateShiftTemplateParams) (*aggregate.ShiftTemplate, error) {
		return nil, scheduleErrors.ErrShiftTemplateNotFound
	}

	rr := s.doRequest("PUT", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111", `{
		"name": "Monday 9-10am",
		"day_of_week": 0,
		"start_time": "09:00",
		"end_time": "10:00",
		"min_staff": 2
	}`)

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- Activate ---

func (s *ShiftTemplateHandlerTestSuite) TestActivate_Success() {
	s.mockSvc.ActivateFn = func(_ context.Context, id uuid.UUID) error {
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111/activate", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

func (s *ShiftTemplateHandlerTestSuite) TestActivate_NotFound() {
	s.mockSvc.ActivateFn = func(_ context.Context, _ uuid.UUID) error {
		return scheduleErrors.ErrShiftTemplateNotFound
	}

	rr := s.doRequest("PATCH", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111/activate", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- Deactivate ---

func (s *ShiftTemplateHandlerTestSuite) TestDeactivate_Success() {
	s.mockSvc.DeactivateFn = func(_ context.Context, id uuid.UUID) error {
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/shift-templates/11111111-1111-1111-1111-111111111111/deactivate", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

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

type SchedulerConfigHandlerTestSuite struct {
	suite.Suite
	mockSvc *mocks.MockSchedulerConfigService
	router  *chi.Mux
}

func TestSchedulerConfigHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(SchedulerConfigHandlerTestSuite))
}

func (s *SchedulerConfigHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockSchedulerConfigService{}
	hdl := handler.NewSchedulerConfigHandler(zap.NewNop(), s.mockSvc)
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)
	})
}

func (s *SchedulerConfigHandlerTestSuite) doRequest(method, path string, body string) *httptest.ResponseRecorder {
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

func (s *SchedulerConfigHandlerTestSuite) sampleSchedulerConfig() *aggregate.SchedulerConfig {
	solverTimeLimit := int32(300)
	return &aggregate.SchedulerConfig{
		ID:                    uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		Name:                  "Default Config",
		CourseShortfallPenalty: 1.0,
		MinHoursPenalty:       10.0,
		MaxHoursPenalty:       5.0,
		UnderstaffedPenalty:   100.0,
		ExtraHoursPenalty:     5.0,
		MaxExtraPenalty:       20.0,
		BaselineHoursTarget:   6,
		SolverTimeLimit:       &solverTimeLimit,
		LogSolverOutput:       false,
		IsDefault:             false,
		CreatedAt:             time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
	}
}

// --- Create ---

func (s *SchedulerConfigHandlerTestSuite) TestCreate_Success() {
	s.mockSvc.CreateFn = func(_ context.Context, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
		c.CreatedAt = time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
		return c, nil
	}

	rr := s.doRequest("POST", "/api/v1/scheduler-configs", `{
		"name": "Default Config",
		"course_shortfall_penalty": 1.0,
		"min_hours_penalty": 10.0,
		"max_hours_penalty": 5.0,
		"understaffed_penalty": 100.0,
		"extra_hours_penalty": 5.0,
		"max_extra_penalty": 20.0,
		"baseline_hours_target": 6,
		"solver_time_limit": 300,
		"log_solver_output": false
	}`)

	s.Equal(http.StatusCreated, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Default Config", resp["name"])
	s.Equal(float64(1), resp["course_shortfall_penalty"])
	s.Equal(float64(6), resp["baseline_hours_target"])
}

func (s *SchedulerConfigHandlerTestSuite) TestCreate_InvalidBody() {
	rr := s.doRequest("POST", "/api/v1/scheduler-configs", `not json`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *SchedulerConfigHandlerTestSuite) TestCreate_ValidationError() {
	rr := s.doRequest("POST", "/api/v1/scheduler-configs", `{
		"name": "",
		"course_shortfall_penalty": 1.0,
		"min_hours_penalty": 10.0,
		"max_hours_penalty": 5.0,
		"understaffed_penalty": 100.0,
		"extra_hours_penalty": 5.0,
		"max_extra_penalty": 20.0,
		"baseline_hours_target": 6,
		"log_solver_output": false
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *SchedulerConfigHandlerTestSuite) TestCreate_Unauthorized() {
	s.mockSvc.CreateFn = func(_ context.Context, _ *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrMissingAuthContext
	}

	rr := s.doRequest("POST", "/api/v1/scheduler-configs", `{
		"name": "Default Config",
		"course_shortfall_penalty": 1.0,
		"min_hours_penalty": 10.0,
		"max_hours_penalty": 5.0,
		"understaffed_penalty": 100.0,
		"extra_hours_penalty": 5.0,
		"max_extra_penalty": 20.0,
		"baseline_hours_target": 6,
		"log_solver_output": false
	}`)

	s.Equal(http.StatusUnauthorized, rr.Code)
}

// --- GetByID ---

func (s *SchedulerConfigHandlerTestSuite) TestGetByID_Success() {
	expected := s.sampleSchedulerConfig()
	s.mockSvc.GetByIDFn = func(_ context.Context, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/scheduler-configs/11111111-1111-1111-1111-111111111111", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("11111111-1111-1111-1111-111111111111", resp["id"])
	s.Equal("Default Config", resp["name"])
	s.Equal(float64(100), resp["understaffed_penalty"])
}

func (s *SchedulerConfigHandlerTestSuite) TestGetByID_InvalidID() {
	rr := s.doRequest("GET", "/api/v1/scheduler-configs/not-a-uuid", "")

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *SchedulerConfigHandlerTestSuite) TestGetByID_NotFound() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	rr := s.doRequest("GET", "/api/v1/scheduler-configs/11111111-1111-1111-1111-111111111111", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- GetDefault ---

func (s *SchedulerConfigHandlerTestSuite) TestGetDefault_Success() {
	expected := s.sampleSchedulerConfig()
	expected.IsDefault = true
	s.mockSvc.GetDefaultFn = func(_ context.Context) (*aggregate.SchedulerConfig, error) {
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/scheduler-configs/default", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Default Config", resp["name"])
	s.Equal(true, resp["is_default"])
}

func (s *SchedulerConfigHandlerTestSuite) TestGetDefault_NotFound() {
	s.mockSvc.GetDefaultFn = func(_ context.Context) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	rr := s.doRequest("GET", "/api/v1/scheduler-configs/default", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- List ---

func (s *SchedulerConfigHandlerTestSuite) TestList_Success() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.SchedulerConfig, error) {
		return []*aggregate.SchedulerConfig{s.sampleSchedulerConfig()}, nil
	}

	rr := s.doRequest("GET", "/api/v1/scheduler-configs", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Len(resp, 1)
	s.Equal("Default Config", resp[0]["name"])
}

func (s *SchedulerConfigHandlerTestSuite) TestList_Empty() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.SchedulerConfig, error) {
		return []*aggregate.SchedulerConfig{}, nil
	}

	rr := s.doRequest("GET", "/api/v1/scheduler-configs", "")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Empty(resp)
}

// --- Update ---

func (s *SchedulerConfigHandlerTestSuite) TestUpdate_Success() {
	expected := s.sampleSchedulerConfig()
	expected.Name = "Updated Config"
	updatedAt := time.Date(2025, 6, 1, 0, 0, 0, 0, time.UTC)
	expected.UpdatedAt = &updatedAt

	s.mockSvc.UpdateFn = func(_ context.Context, id uuid.UUID, params service.UpdateSchedulerConfigParams) (*aggregate.SchedulerConfig, error) {
		s.Equal(expected.ID, id)
		s.Equal("Updated Config", params.Name)
		return expected, nil
	}

	rr := s.doRequest("PUT", "/api/v1/scheduler-configs/11111111-1111-1111-1111-111111111111", `{
		"name": "Updated Config",
		"course_shortfall_penalty": 1.0,
		"min_hours_penalty": 10.0,
		"max_hours_penalty": 5.0,
		"understaffed_penalty": 100.0,
		"extra_hours_penalty": 5.0,
		"max_extra_penalty": 20.0,
		"baseline_hours_target": 6,
		"solver_time_limit": 300,
		"log_solver_output": false
	}`)

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("Updated Config", resp["name"])
	s.NotNil(resp["updated_at"])
}

func (s *SchedulerConfigHandlerTestSuite) TestUpdate_InvalidID() {
	rr := s.doRequest("PUT", "/api/v1/scheduler-configs/not-a-uuid", `{
		"name": "Updated Config",
		"course_shortfall_penalty": 1.0,
		"min_hours_penalty": 10.0,
		"max_hours_penalty": 5.0,
		"understaffed_penalty": 100.0,
		"extra_hours_penalty": 5.0,
		"max_extra_penalty": 20.0,
		"baseline_hours_target": 6,
		"log_solver_output": false
	}`)

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *SchedulerConfigHandlerTestSuite) TestUpdate_NotFound() {
	s.mockSvc.UpdateFn = func(_ context.Context, _ uuid.UUID, _ service.UpdateSchedulerConfigParams) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	rr := s.doRequest("PUT", "/api/v1/scheduler-configs/11111111-1111-1111-1111-111111111111", `{
		"name": "Updated Config",
		"course_shortfall_penalty": 1.0,
		"min_hours_penalty": 10.0,
		"max_hours_penalty": 5.0,
		"understaffed_penalty": 100.0,
		"extra_hours_penalty": 5.0,
		"max_extra_penalty": 20.0,
		"baseline_hours_target": 6,
		"log_solver_output": false
	}`)

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- SetDefault ---

func (s *SchedulerConfigHandlerTestSuite) TestSetDefault_Success() {
	s.mockSvc.SetDefaultFn = func(_ context.Context, id uuid.UUID) error {
		s.Equal(uuid.MustParse("11111111-1111-1111-1111-111111111111"), id)
		return nil
	}

	rr := s.doRequest("PATCH", "/api/v1/scheduler-configs/11111111-1111-1111-1111-111111111111/set-default", "")

	s.Equal(http.StatusNoContent, rr.Code)
}

func (s *SchedulerConfigHandlerTestSuite) TestSetDefault_InvalidID() {
	rr := s.doRequest("PATCH", "/api/v1/scheduler-configs/not-a-uuid/set-default", "")

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *SchedulerConfigHandlerTestSuite) TestSetDefault_NotFound() {
	s.mockSvc.SetDefaultFn = func(_ context.Context, _ uuid.UUID) error {
		return scheduleErrors.ErrSchedulerConfigNotFound
	}

	rr := s.doRequest("PATCH", "/api/v1/scheduler-configs/11111111-1111-1111-1111-111111111111/set-default", "")

	s.Equal(http.StatusNotFound, rr.Code)
}

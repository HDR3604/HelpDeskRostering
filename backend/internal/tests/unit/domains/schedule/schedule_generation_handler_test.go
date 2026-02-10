package schedule_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type ScheduleGenerationHandlerTestSuite struct {
	suite.Suite
	mockSvc *mocks.MockScheduleGenerationService
	router  *chi.Mux
}

func TestScheduleGenerationHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleGenerationHandlerTestSuite))
}

func (s *ScheduleGenerationHandlerTestSuite) SetupTest() {
	s.mockSvc = &mocks.MockScheduleGenerationService{}
	hdl := handler.NewScheduleGenerationHandler(zap.NewNop(), s.mockSvc)
	s.router = chi.NewRouter()
	s.router.Route("/api/v1", func(r chi.Router) {
		hdl.RegisterRoutes(r)
	})
}

func (s *ScheduleGenerationHandlerTestSuite) doRequest(method, path string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	rr := httptest.NewRecorder()
	s.router.ServeHTTP(rr, req)
	return rr
}

func (s *ScheduleGenerationHandlerTestSuite) sampleGeneration() *aggregate.ScheduleGeneration {
	scheduleID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	requestPayload := `{"assistants":[],"shifts":[]}`
	responsePayload := `{"assignments":[]}`
	startedAt := time.Date(2025, 1, 1, 0, 1, 0, 0, time.UTC)
	completedAt := time.Date(2025, 1, 1, 0, 5, 0, 0, time.UTC)

	return &aggregate.ScheduleGeneration{
		ID:              uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		ScheduleID:      &scheduleID,
		ConfigID:        uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Status:          aggregate.GenerationStatus_Completed,
		RequestPayload:  &requestPayload,
		ResponsePayload: &responsePayload,
		StartedAt:       &startedAt,
		CompletedAt:     &completedAt,
		CreatedAt:       time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedBy:       uuid.MustParse("44444444-4444-4444-4444-444444444444"),
	}
}

// --- GetByID ---

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_Success() {
	expected := s.sampleGeneration()
	s.mockSvc.GetByIDFn = func(_ context.Context, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("11111111-1111-1111-1111-111111111111", resp["id"])
	s.Equal("22222222-2222-2222-2222-222222222222", resp["config_id"])
	s.Equal("33333333-3333-3333-3333-333333333333", resp["schedule_id"])
	s.Equal("completed", resp["status"])
	s.Equal("44444444-4444-4444-4444-444444444444", resp["created_by"])
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_InvalidUUID() {
	rr := s.doRequest("GET", "/api/v1/schedule-generations/not-a-uuid")

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_NotFound() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrGenerationNotFound
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111")

	s.Equal(http.StatusNotFound, rr.Code)
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_Unauthorized() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrMissingAuthContext
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111")

	s.Equal(http.StatusUnauthorized, rr.Code)
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_InternalError() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return nil, context.DeadlineExceeded
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111")

	s.Equal(http.StatusInternalServerError, rr.Code)
}

// --- List ---

func (s *ScheduleGenerationHandlerTestSuite) TestList_Success() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.ScheduleGeneration, error) {
		return []*aggregate.ScheduleGeneration{s.sampleGeneration()}, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Len(resp, 1)
	s.Equal("completed", resp[0]["status"])
}

func (s *ScheduleGenerationHandlerTestSuite) TestList_Empty() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.ScheduleGeneration, error) {
		return []*aggregate.ScheduleGeneration{}, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations")

	s.Equal(http.StatusOK, rr.Code)

	var resp []map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Empty(resp)
}

func (s *ScheduleGenerationHandlerTestSuite) TestList_Unauthorized() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrMissingAuthContext
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations")

	s.Equal(http.StatusUnauthorized, rr.Code)
}

func (s *ScheduleGenerationHandlerTestSuite) TestList_InternalError() {
	s.mockSvc.ListFn = func(_ context.Context) ([]*aggregate.ScheduleGeneration, error) {
		return nil, context.DeadlineExceeded
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations")

	s.Equal(http.StatusInternalServerError, rr.Code)
}

// --- GetStatus ---

func (s *ScheduleGenerationHandlerTestSuite) TestGetStatus_Success() {
	expected := s.sampleGeneration()
	s.mockSvc.GetByIDFn = func(_ context.Context, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111/status")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("11111111-1111-1111-1111-111111111111", resp["id"])
	s.Equal("completed", resp["status"])
	s.Equal("33333333-3333-3333-3333-333333333333", resp["schedule_id"])
	// Payloads should not be included in status response
	s.Nil(resp["request_payload"])
	s.Nil(resp["response_payload"])
	s.Nil(resp["config_id"])
	s.Nil(resp["created_by"])
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetStatus_Pending() {
	gen := &aggregate.ScheduleGeneration{
		ID:        uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		ConfigID:  uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Status:    aggregate.GenerationStatus_Pending,
		CreatedAt: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedBy: uuid.MustParse("44444444-4444-4444-4444-444444444444"),
	}

	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111/status")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("pending", resp["status"])
	s.Nil(resp["schedule_id"])
	s.Nil(resp["error_message"])
	s.Nil(resp["started_at"])
	s.Nil(resp["completed_at"])
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetStatus_Failed() {
	errorMsg := "scheduler service is not available"
	startedAt := time.Date(2025, 1, 1, 0, 1, 0, 0, time.UTC)
	completedAt := time.Date(2025, 1, 1, 0, 2, 0, 0, time.UTC)

	gen := &aggregate.ScheduleGeneration{
		ID:           uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		ConfigID:     uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Status:       aggregate.GenerationStatus_Failed,
		ErrorMessage: &errorMsg,
		StartedAt:    &startedAt,
		CompletedAt:  &completedAt,
		CreatedAt:    time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedBy:    uuid.MustParse("44444444-4444-4444-4444-444444444444"),
	}

	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111/status")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))
	s.Equal("failed", resp["status"])
	s.Equal("scheduler service is not available", resp["error_message"])
	s.NotNil(resp["started_at"])
	s.NotNil(resp["completed_at"])
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetStatus_InvalidUUID() {
	rr := s.doRequest("GET", "/api/v1/schedule-generations/not-a-uuid/status")

	s.Equal(http.StatusBadRequest, rr.Code)
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetStatus_NotFound() {
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return nil, scheduleErrors.ErrGenerationNotFound
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111/status")

	s.Equal(http.StatusNotFound, rr.Code)
}

// --- JSON payload rendering ---

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_PayloadsRenderedAsJSON() {
	expected := s.sampleGeneration()
	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return expected, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))

	// Verify payloads are rendered as JSON objects, not escaped strings
	reqPayload, ok := resp["request_payload"].(map[string]any)
	s.Require().True(ok, "request_payload should be a JSON object")
	s.Contains(reqPayload, "assistants")

	respPayload, ok := resp["response_payload"].(map[string]any)
	s.Require().True(ok, "response_payload should be a JSON object")
	s.Contains(respPayload, "assignments")
}

func (s *ScheduleGenerationHandlerTestSuite) TestGetByID_NilOptionalFields() {
	gen := &aggregate.ScheduleGeneration{
		ID:        uuid.MustParse("11111111-1111-1111-1111-111111111111"),
		ConfigID:  uuid.MustParse("22222222-2222-2222-2222-222222222222"),
		Status:    aggregate.GenerationStatus_Pending,
		CreatedAt: time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		CreatedBy: uuid.MustParse("44444444-4444-4444-4444-444444444444"),
	}

	s.mockSvc.GetByIDFn = func(_ context.Context, _ uuid.UUID) (*aggregate.ScheduleGeneration, error) {
		return gen, nil
	}

	rr := s.doRequest("GET", "/api/v1/schedule-generations/11111111-1111-1111-1111-111111111111")

	s.Equal(http.StatusOK, rr.Code)

	var resp map[string]any
	s.Require().NoError(json.Unmarshal(rr.Body.Bytes(), &resp))

	s.Nil(resp["schedule_id"])
	s.Nil(resp["error_message"])
	s.Nil(resp["started_at"])
	s.Nil(resp["completed_at"])
}

package service

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"go.uber.org/zap"
)

var _ interfaces.SchedulerServiceInterface = (*SchedulerService)(nil)

type SchedulerService struct {
	logger  *zap.Logger
	baseurl string
}

func NewSchedulerService(logger *zap.Logger) interfaces.SchedulerServiceInterface {
	url := os.Getenv("SCHEDULER_SERVICE_URL")

	if url == "" {
		// Stop further execution
		panic("SCHEDULER_SERVICE_URL is not set in the current environment")
	}

	return &SchedulerService{
		logger:  logger,
		baseurl: url,
	}
}

func (s *SchedulerService) GenerateSchedule(req types.GenerateScheduleRequest) (*types.GenerateScheduleResponse, error) {
	// Marshal given request as json
	request, err := json.Marshal(req)

	if err != nil {
		s.logger.Error("failed to marshal request", zap.Error(err))
		s.logger.Debug("marshal failure details", zap.Any("request_body", req))
		return nil, fmt.Errorf("%w: %w", errors.ErrMarshalRequest, err)
	}

	// Ensure that the schedule service is available
	healthResponse, err := http.Get(s.baseurl + "/api/v1/healthy")
	if err != nil {
		s.logger.Error("scheduler health check failed", zap.String("url", s.baseurl), zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrSchedulerUnavailable, err)
	}
	defer func() { _ = healthResponse.Body.Close() }()

	// Make request to generate schedule
	scheduleResponse, err := http.Post(s.baseurl+"/api/v1/schedules/generate", "application/json", bytes.NewReader(request))
	if err != nil {
		s.logger.Error("failed to send schedule request", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrSchedulerUnavailable, err)
	}
	defer func() { _ = scheduleResponse.Body.Close() }()

	if scheduleResponse.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(scheduleResponse.Body)
		s.logger.Error("scheduler rejected request",
			zap.Int("status_code", scheduleResponse.StatusCode),
			zap.String("response_body", string(body)),
		)

		switch {
		case scheduleResponse.StatusCode == http.StatusUnprocessableEntity:
			return nil, fmt.Errorf("%w: %s", errors.ErrInvalidRequest, string(body))
		case scheduleResponse.StatusCode >= 500:
			return nil, fmt.Errorf("%w: status %d", errors.ErrSchedulerInternal, scheduleResponse.StatusCode)
		default:
			return nil, fmt.Errorf("%w: unexpected status %d: %s", errors.ErrSchedulerInternal, scheduleResponse.StatusCode, string(body))
		}
	}

	var result types.GenerateScheduleResponse
	if err := json.NewDecoder(scheduleResponse.Body).Decode(&result); err != nil {
		s.logger.Error("failed to decode response", zap.Error(err))
		return nil, fmt.Errorf("%w: %w", errors.ErrUnmarshalResponse, err)
	}

	return &result, nil
}

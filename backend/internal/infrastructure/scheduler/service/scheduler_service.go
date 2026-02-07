package scheduler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	interfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/interface"
	types "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
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
		s.logger.Error("failed to marshal generate schedule request", zap.Error(err))
		s.logger.Debug("failed to marshal generate schedule request", zap.Any("request_body", req))
		return nil, fmt.Errorf("failed to marshal generate schedule request: %w", err)
	}

	// Ensure that the schedule service is available
	healthResponse, err := http.Get(s.baseurl + "/api/v1/healthy")
	if err != nil {
		s.logger.Error("health check failed", zap.Error(types.ErrSchedulerUnavailable))
		return nil, fmt.Errorf("health check failed: %w", types.ErrSchedulerUnavailable)
	}
	defer healthResponse.Body.Close()

	// Make request to generate schedule
	scheduleResponse, err := http.Post(s.baseurl+"/api/v1/schedules/generate", "application/json", bytes.NewReader(request))
	if err != nil {
		s.logger.Error("failed to request schedule generation", zap.Error(err))
		return nil, fmt.Errorf("failed to request schedule generation: %w", err)
	}
	defer scheduleResponse.Body.Close()

	if scheduleResponse.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("scheduler returned status %d", scheduleResponse.StatusCode)
	}

	var result types.GenerateScheduleResponse
	if err := json.NewDecoder(scheduleResponse.Body).Decode(&result); err != nil {
		s.logger.Error("failed to decode generate schedule response body", zap.Error(err))
		return nil, fmt.Errorf("failed to decode generate schedule response body: %w", err)
	}

	return &result, nil
}

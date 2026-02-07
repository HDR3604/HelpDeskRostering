package infrastructure_test

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type SchedulerServiceTestSuite struct {
	suite.Suite
	server  *httptest.Server
	mux     *http.ServeMux
	service interfaces.SchedulerServiceInterface
	logger  *zap.Logger
}

func TestSchedulerServiceTestSuite(t *testing.T) {
	suite.Run(t, new(SchedulerServiceTestSuite))
}

func (s *SchedulerServiceTestSuite) SetupTest() {
	s.mux = http.NewServeMux()
	s.server = httptest.NewServer(s.mux)
	s.logger = zap.NewNop()

	os.Setenv("SCHEDULER_SERVICE_URL", s.server.URL)
	s.service = service.NewSchedulerService(s.logger)
}

func (s *SchedulerServiceTestSuite) TearDownTest() {
	s.server.Close()
}

func (s *SchedulerServiceTestSuite) validRequest() types.GenerateScheduleRequest {
	return types.GenerateScheduleRequest{
		Assistants: []types.Assistant{
			{
				ID:           "a1",
				Courses:      []string{"CS101"},
				Availability: []types.AvailabilityWindow{{DayOfWeek: 1, Start: "09:00:00", End: "13:00:00"}},
				MinHours:     4,
				MaxHours:     10,
				CostPerHour:  15,
			},
		},
		Shifts: []types.Shift{
			{
				ID:            "s1",
				DayOfWeek:     1,
				Start:         "09:00:00",
				End:           "13:00:00",
				CourseDemands: []types.CourseDemand{{CourseCode: "CS101", TutorsRequired: 1, Weight: 1.0}},
				MinStaff:      1,
			},
		},
	}
}

func (s *SchedulerServiceTestSuite) TestGenerateSchedule_Success() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/schedules/generate", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		fmt.Fprint(w, `{
			"status": "Optimal",
			"assignments": [{"assistant_id": "a1", "shift_id": "s1", "day_of_week": 1, "start": "09:00:00", "end": "13:00:00"}],
			"assistant_hours": {"a1": 4},
			"metadata": {"objective_value": 60, "solver_status_code": 1, "course_shortfalls": {}, "staff_shortfalls": {}}
		}`)
	})

	result, err := s.service.GenerateSchedule(s.validRequest())

	s.NoError(err)
	s.Equal(types.ScheduleStatus_Optimal, result.Status)
	s.Len(result.Assignments, 1)
	s.Equal("a1", result.Assignments[0].AssistantID)
	s.Equal("s1", result.Assignments[0].ShiftID)
}

func (s *SchedulerServiceTestSuite) TestGenerateSchedule_SchedulerReturns422() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/schedules/generate", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		fmt.Fprint(w, `{"detail": "validation error"}`)
	})

	result, err := s.service.GenerateSchedule(s.validRequest())

	s.Nil(result)
	s.True(errors.Is(err, types.ErrInvalidRequest))
}

func (s *SchedulerServiceTestSuite) TestGenerateSchedule_SchedulerReturns500() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/schedules/generate", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	})

	result, err := s.service.GenerateSchedule(s.validRequest())

	s.Nil(result)
	s.True(errors.Is(err, types.ErrSchedulerInternal))
}

func (s *SchedulerServiceTestSuite) TestGenerateSchedule_HealthCheckFails() {
	// Close the server so the health check connection fails
	s.server.Close()

	result, err := s.service.GenerateSchedule(s.validRequest())

	s.Nil(result)
	s.True(errors.Is(err, types.ErrSchedulerUnavailable))
}

func (s *SchedulerServiceTestSuite) TestGenerateSchedule_MalformedResponse() {
	s.mux.HandleFunc("/api/v1/healthy", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})
	s.mux.HandleFunc("/api/v1/schedules/generate", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
		fmt.Fprint(w, `not valid json`)
	})

	result, err := s.service.GenerateSchedule(s.validRequest())

	s.Nil(result)
	s.True(errors.Is(err, types.ErrUnmarshalResponse))
}


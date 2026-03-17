package timelog_test

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	scheduleAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type TimeLogServiceTestSuite struct {
	suite.Suite
	timeLogRepo     *mocks.MockTimeLogRepository
	clockInCodeRepo *mocks.MockClockInCodeRepository
	scheduleRepo    *mocks.MockScheduleRepository
	service         service.TimeLogServiceInterface
	studentCtx      context.Context
	adminCtx        context.Context
}

func TestTimeLogServiceTestSuite(t *testing.T) {
	suite.Run(t, new(TimeLogServiceTestSuite))
}

func (s *TimeLogServiceTestSuite) SetupTest() {
	s.timeLogRepo = &mocks.MockTimeLogRepository{}
	s.clockInCodeRepo = &mocks.MockClockInCodeRepository{}
	s.scheduleRepo = &mocks.MockScheduleRepository{}

	s.service = service.NewTimeLogService(
		zap.NewNop(),
		&mocks.StubTxManager{},
		s.timeLogRepo,
		s.clockInCodeRepo,
		s.scheduleRepo,
		-61.277001, // helpDeskLon
		10.642707,  // helpDeskLat
	)

	studentID := "12345"
	s.studentCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID:    uuid.New().String(),
		StudentID: &studentID,
		Role:      "student",
	})

	s.adminCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID: uuid.New().String(),
		Role:   "admin",
	})
}

func (s *TimeLogServiceTestSuite) validCode() *aggregate.ClockInCode {
	return &aggregate.ClockInCode{
		ID:        uuid.New(),
		Code:      "A1B2C3D4",
		ExpiresAt: time.Now().UTC().Add(30 * time.Minute),
		CreatedAt: time.Now().UTC(),
		CreatedBy: uuid.New(),
	}
}

// buildAssignments creates assignments JSON with a shift for the given student
// at the current day/time.
func (s *TimeLogServiceTestSuite) buildAssignments(studentID string, now time.Time) json.RawMessage {
	scheduleDay := (int(now.Weekday()) + 6) % 7
	start := now.Add(-30 * time.Minute).Format("15:04:05")
	end := now.Add(30 * time.Minute).Format("15:04:05")

	assignments := []map[string]any{
		{
			"assistant_id": studentID,
			"shift_id":     uuid.New().String(),
			"day_of_week":  scheduleDay,
			"start":        start,
			"end":          end,
		},
	}
	data, err := json.Marshal(assignments)
	s.Require().NoError(err, "failed to marshal assignments")
	return data
}

func (s *TimeLogServiceTestSuite) activeScheduleWith(assignments json.RawMessage) *scheduleAggregate.Schedule {
	return &scheduleAggregate.Schedule{
		ScheduleID:  uuid.New(),
		Title:       "Test Schedule",
		IsActive:    true,
		Assignments: assignments,
	}
}

// --- ClockIn ---

func (s *TimeLogServiceTestSuite) TestClockIn_Success() {
	now := time.Now().UTC()
	assignments := s.buildAssignments("12345", now)
	schedule := s.activeScheduleWith(assignments)

	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, code string) (*aggregate.ClockInCode, error) {
		s.Equal("A1B2C3D4", code)
		return s.validCode(), nil
	}
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, sid int32) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}
	s.scheduleRepo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*scheduleAggregate.Schedule, error) {
		return schedule, nil
	}
	s.timeLogRepo.CreateFn = func(_ context.Context, _ *sql.Tx, tl *aggregate.TimeLog) (*aggregate.TimeLog, error) {
		s.Equal(int32(12345), tl.StudentID)
		s.Equal(-61.277001, tl.Longitude)
		s.Equal(10.642707, tl.Latitude)
		tl.CreatedAt = now
		return tl, nil
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.Require().NoError(err)
	s.NotNil(result)
	s.Equal(int32(12345), result.StudentID)
}

func (s *TimeLogServiceTestSuite) TestClockIn_InvalidCode() {
	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.ClockInCode, error) {
		return nil, timelogErrors.ErrInvalidClockInCode
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "BADCODE1",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.ErrorIs(err, timelogErrors.ErrInvalidClockInCode)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestClockIn_ExpiredCode() {
	expired := s.validCode()
	expired.ExpiresAt = time.Now().UTC().Add(-10 * time.Minute)

	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.ClockInCode, error) {
		return expired, nil
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.ErrorIs(err, timelogErrors.ErrInvalidClockInCode)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestClockIn_AlreadyClockedIn() {
	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.ClockInCode, error) {
		return s.validCode(), nil
	}
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		tl, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 10.0)
		return tl, nil
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.ErrorIs(err, timelogErrors.ErrAlreadyClockedIn)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestClockIn_NoActiveShift() {
	// Assignments for a different student
	now := time.Now().UTC()
	assignments := s.buildAssignments("99999", now)
	schedule := s.activeScheduleWith(assignments)

	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.ClockInCode, error) {
		return s.validCode(), nil
	}
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}
	s.scheduleRepo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*scheduleAggregate.Schedule, error) {
		return schedule, nil
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.ErrorIs(err, timelogErrors.ErrNoActiveShift)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestClockIn_10MinEarly_Allowed() {
	// Use a fixed time to avoid race conditions between test setup and service call
	fixedNow := time.Date(2026, 3, 18, 10, 0, 0, 0, time.UTC) // Wednesday
	s.service.(*service.TimeLogService).WithNowFn(func() time.Time { return fixedNow })
	scheduleDay := (int(fixedNow.Weekday()) + 6) % 7

	// Shift starts 8 minutes from fixedNow, ends 60 minutes from fixedNow
	start := fixedNow.Add(8 * time.Minute).Format("15:04:05")
	end := fixedNow.Add(60 * time.Minute).Format("15:04:05")

	assignments, _ := json.Marshal([]map[string]any{
		{
			"assistant_id": "12345",
			"shift_id":     uuid.New().String(),
			"day_of_week":  scheduleDay,
			"start":        start,
			"end":          end,
		},
	})
	schedule := s.activeScheduleWith(assignments)

	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.ClockInCode, error) {
		return s.validCode(), nil
	}
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}
	s.scheduleRepo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*scheduleAggregate.Schedule, error) {
		return schedule, nil
	}
	s.timeLogRepo.CreateFn = func(_ context.Context, _ *sql.Tx, tl *aggregate.TimeLog) (*aggregate.TimeLog, error) {
		tl.CreatedAt = fixedNow
		return tl, nil
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.Require().NoError(err)
	s.NotNil(result)
}

func (s *TimeLogServiceTestSuite) TestClockIn_ShiftEnded_Rejected() {
	fixedNow := time.Date(2026, 3, 18, 10, 0, 0, 0, time.UTC) // Wednesday
	s.service.(*service.TimeLogService).WithNowFn(func() time.Time { return fixedNow })
	scheduleDay := (int(fixedNow.Weekday()) + 6) % 7

	// Shift ended 30 minutes ago
	start := fixedNow.Add(-90 * time.Minute).Format("15:04:05")
	end := fixedNow.Add(-30 * time.Minute).Format("15:04:05")

	assignments, _ := json.Marshal([]map[string]any{
		{
			"assistant_id": "12345",
			"shift_id":     uuid.New().String(),
			"day_of_week":  scheduleDay,
			"start":        start,
			"end":          end,
		},
	})
	schedule := s.activeScheduleWith(assignments)

	s.clockInCodeRepo.GetByCodeFn = func(_ context.Context, _ *sql.Tx, _ string) (*aggregate.ClockInCode, error) {
		return s.validCode(), nil
	}
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}
	s.scheduleRepo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*scheduleAggregate.Schedule, error) {
		return schedule, nil
	}

	result, err := s.service.ClockIn(s.studentCtx, service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.ErrorIs(err, timelogErrors.ErrNoActiveShift)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestClockIn_MissingAuthContext() {
	result, err := s.service.ClockIn(context.Background(), service.ClockInInput{
		Code:      "A1B2C3D4",
		Longitude: -61.277001,
		Latitude:  10.642707,
	})

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- ClockOut ---

func (s *TimeLogServiceTestSuite) TestClockOut_Success() {
	openLog, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)

	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, sid int32) (*aggregate.TimeLog, error) {
		s.Equal(int32(12345), sid)
		return openLog, nil
	}
	s.timeLogRepo.UpdateFn = func(_ context.Context, _ *sql.Tx, tl *aggregate.TimeLog) (*aggregate.TimeLog, error) {
		s.NotNil(tl.ExitAt)
		return tl, nil
	}

	result, err := s.service.ClockOut(s.studentCtx)

	s.Require().NoError(err)
	s.NotNil(result)
	s.NotNil(result.ExitAt)
}

func (s *TimeLogServiceTestSuite) TestClockOut_NotClockedIn() {
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	result, err := s.service.ClockOut(s.studentCtx)

	s.ErrorIs(err, timelogErrors.ErrNotClockedIn)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestClockOut_MissingAuthContext() {
	result, err := s.service.ClockOut(context.Background())

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- GetMyStatus ---

func (s *TimeLogServiceTestSuite) TestGetMyStatus_ClockedIn() {
	now := time.Now().UTC()
	openLog, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	assignments := s.buildAssignments("12345", now)
	schedule := s.activeScheduleWith(assignments)

	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		return openLog, nil
	}
	s.scheduleRepo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*scheduleAggregate.Schedule, error) {
		return schedule, nil
	}

	status, err := s.service.GetMyStatus(s.studentCtx)

	s.Require().NoError(err)
	s.True(status.IsClockedIn)
	s.NotNil(status.CurrentLog)
	s.NotNil(status.CurrentShift)
}

func (s *TimeLogServiceTestSuite) TestGetMyStatus_NotClockedIn() {
	s.timeLogRepo.GetOpenByStudentIDFn = func(_ context.Context, _ *sql.Tx, _ int32) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	status, err := s.service.GetMyStatus(s.studentCtx)

	s.Require().NoError(err)
	s.False(status.IsClockedIn)
	s.Nil(status.CurrentLog)
	s.Nil(status.CurrentShift)
}

func (s *TimeLogServiceTestSuite) TestGetMyStatus_MissingAuthContext() {
	status, err := s.service.GetMyStatus(context.Background())

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(status)
}

// --- ListMyTimeLogs ---

func (s *TimeLogServiceTestSuite) TestListMyTimeLogs_Success() {
	tl1, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	tl2, _ := aggregate.NewTimeLog(12345, -61.278, 10.643, 20.0)

	s.timeLogRepo.ListFn = func(_ context.Context, _ *sql.Tx, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error) {
		s.Require().NotNil(filter.StudentID)
		s.Equal(int32(12345), *filter.StudentID)
		return []*aggregate.TimeLog{tl1, tl2}, 2, nil
	}

	logs, total, err := s.service.ListMyTimeLogs(s.studentCtx, repository.TimeLogFilter{Page: 1, PerPage: 20})

	s.Require().NoError(err)
	s.Len(logs, 2)
	s.Equal(2, total)
}

// --- GenerateClockInCode ---

func (s *TimeLogServiceTestSuite) TestGenerateClockInCode_Success() {
	s.clockInCodeRepo.DeleteExpiredFn = func(_ context.Context, _ *sql.Tx) error {
		return nil
	}
	s.clockInCodeRepo.CreateFn = func(_ context.Context, _ *sql.Tx, code *aggregate.ClockInCode) (*aggregate.ClockInCode, error) {
		code.CreatedAt = time.Now().UTC()
		return code, nil
	}

	result, err := s.service.GenerateClockInCode(s.adminCtx, 60)

	s.Require().NoError(err)
	s.NotNil(result)
	s.Len(result.Code, 8)
}

func (s *TimeLogServiceTestSuite) TestGenerateClockInCode_NotAdmin() {
	result, err := s.service.GenerateClockInCode(s.studentCtx, 60)

	s.ErrorIs(err, timelogErrors.ErrNotAuthorized)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestGenerateClockInCode_MissingAuth() {
	result, err := s.service.GenerateClockInCode(context.Background(), 60)

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- GetActiveClockInCode ---

func (s *TimeLogServiceTestSuite) TestGetActiveClockInCode_Success() {
	expected := s.validCode()

	s.clockInCodeRepo.GetActiveFn = func(_ context.Context, _ *sql.Tx) (*aggregate.ClockInCode, error) {
		return expected, nil
	}

	result, err := s.service.GetActiveClockInCode(s.adminCtx)

	s.Require().NoError(err)
	s.Equal(expected.Code, result.Code)
}

func (s *TimeLogServiceTestSuite) TestGetActiveClockInCode_NotAdmin() {
	result, err := s.service.GetActiveClockInCode(s.studentCtx)

	s.ErrorIs(err, timelogErrors.ErrNotAuthorized)
	s.Nil(result)
}

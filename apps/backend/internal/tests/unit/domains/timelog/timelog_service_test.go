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
// at the current day/time. Schedule times are in local time (AST = UTC-4).
func (s *TimeLogServiceTestSuite) buildAssignments(studentID string, now time.Time) json.RawMessage {
	localTZ := time.FixedZone("AST", -4*60*60)
	local := now.In(localTZ)
	scheduleDay := (int(local.Weekday()) + 6) % 7
	start := local.Add(-30 * time.Minute).Format("15:04:05")
	end := local.Add(30 * time.Minute).Format("15:04:05")

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
	fixedNow := time.Date(2026, 3, 18, 10, 0, 0, 0, time.UTC) // Wednesday
	s.service.(*service.TimeLogService).WithNowFn(func() time.Time { return fixedNow })
	assignments := s.buildAssignments("12345", fixedNow)
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
	fixedNow := time.Date(2026, 3, 18, 10, 0, 0, 0, time.UTC) // Wednesday
	s.service.(*service.TimeLogService).WithNowFn(func() time.Time { return fixedNow })
	assignments := s.buildAssignments("99999", fixedNow)
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

func (s *TimeLogServiceTestSuite) TestClockIn_5MinEarly_Allowed() {
	// Use a fixed time to avoid race conditions between test setup and service call
	fixedNow := time.Date(2026, 3, 18, 10, 0, 0, 0, time.UTC) // Wednesday
	s.service.(*service.TimeLogService).WithNowFn(func() time.Time { return fixedNow })
	localTZ := time.FixedZone("AST", -4*60*60)
	local := fixedNow.In(localTZ)
	scheduleDay := (int(local.Weekday()) + 6) % 7

	// Shift starts 3 minutes from now (local), ends 60 minutes from now (local)
	// With 5-min early buffer, clocking in 3 minutes before shift should be allowed
	start := local.Add(3 * time.Minute).Format("15:04:05")
	end := local.Add(60 * time.Minute).Format("15:04:05")

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
	localTZ := time.FixedZone("AST", -4*60*60)
	local := fixedNow.In(localTZ)
	scheduleDay := (int(local.Weekday()) + 6) % 7

	// Shift ended 30 minutes ago (in local time)
	start := local.Add(-90 * time.Minute).Format("15:04:05")
	end := local.Add(-30 * time.Minute).Format("15:04:05")

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
	fixedNow := time.Date(2026, 3, 18, 10, 0, 0, 0, time.UTC) // Wednesday
	s.service.(*service.TimeLogService).WithNowFn(func() time.Time { return fixedNow })
	openLog, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	openLog.EntryAt = fixedNow // match the pinned clock
	assignments := s.buildAssignments("12345", fixedNow)
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

// --- Admin: ListTimeLogs ---

func (s *TimeLogServiceTestSuite) TestListTimeLogs_Success() {
	tl, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	atl := &aggregate.AdminTimeLog{
		TimeLog:      *tl,
		StudentName:  "John Doe",
		StudentEmail: "john@example.com",
		StudentPhone: "555-1234",
	}

	s.timeLogRepo.ListWithStudentDetailsFn = func(_ context.Context, _ *sql.Tx, filter repository.TimeLogFilter) ([]*aggregate.AdminTimeLog, int, error) {
		s.Equal(1, filter.Page)
		s.Equal(20, filter.PerPage)
		return []*aggregate.AdminTimeLog{atl}, 1, nil
	}

	logs, total, err := s.service.ListTimeLogs(s.adminCtx, repository.TimeLogFilter{Page: 1, PerPage: 20})

	s.Require().NoError(err)
	s.Len(logs, 1)
	s.Equal(1, total)
	s.Equal("John Doe", logs[0].StudentName)
	s.Equal("john@example.com", logs[0].StudentEmail)
}

func (s *TimeLogServiceTestSuite) TestListTimeLogs_NotAdmin() {
	_, _, err := s.service.ListTimeLogs(s.studentCtx, repository.TimeLogFilter{Page: 1, PerPage: 20})

	s.ErrorIs(err, timelogErrors.ErrNotAuthorized)
}

func (s *TimeLogServiceTestSuite) TestListTimeLogs_MissingAuth() {
	_, _, err := s.service.ListTimeLogs(context.Background(), repository.TimeLogFilter{Page: 1, PerPage: 20})

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
}

// --- Admin: GetTimeLog ---

func (s *TimeLogServiceTestSuite) TestGetTimeLog_Success() {
	fixedID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
	tl, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	tl.ID = fixedID
	atl := &aggregate.AdminTimeLog{
		TimeLog:      *tl,
		StudentName:  "Jane Doe",
		StudentEmail: "jane@example.com",
		StudentPhone: "555-5678",
	}

	s.timeLogRepo.GetByIDWithStudentDetailsFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.AdminTimeLog, error) {
		s.Equal(fixedID, id)
		return atl, nil
	}

	result, err := s.service.GetTimeLog(s.adminCtx, fixedID)

	s.Require().NoError(err)
	s.Equal(fixedID, result.ID)
	s.Equal("Jane Doe", result.StudentName)
}

func (s *TimeLogServiceTestSuite) TestGetTimeLog_NotFound() {
	s.timeLogRepo.GetByIDWithStudentDetailsFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.AdminTimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	result, err := s.service.GetTimeLog(s.adminCtx, uuid.New())

	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestGetTimeLog_NotAdmin() {
	result, err := s.service.GetTimeLog(s.studentCtx, uuid.New())

	s.ErrorIs(err, timelogErrors.ErrNotAuthorized)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestGetTimeLog_MissingAuth() {
	result, err := s.service.GetTimeLog(context.Background(), uuid.New())

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- Admin: FlagTimeLog ---

func (s *TimeLogServiceTestSuite) TestFlagTimeLog_Success() {
	fixedID := uuid.MustParse("22222222-2222-2222-2222-222222222222")
	tl, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	tl.ID = fixedID

	s.timeLogRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.TimeLog, error) {
		s.Equal(fixedID, id)
		return tl, nil
	}
	s.timeLogRepo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.TimeLog) (*aggregate.TimeLog, error) {
		s.True(updated.IsFlagged)
		s.Require().NotNil(updated.FlagReason)
		s.Equal("suspicious distance", *updated.FlagReason)
		return updated, nil
	}

	result, err := s.service.FlagTimeLog(s.adminCtx, fixedID, "suspicious distance")

	s.Require().NoError(err)
	s.True(result.IsFlagged)
	s.Equal("suspicious distance", *result.FlagReason)
}

func (s *TimeLogServiceTestSuite) TestFlagTimeLog_NotFound() {
	s.timeLogRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	result, err := s.service.FlagTimeLog(s.adminCtx, uuid.New(), "reason")

	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestFlagTimeLog_EmptyReason() {
	tl, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)

	s.timeLogRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.TimeLog, error) {
		return tl, nil
	}

	result, err := s.service.FlagTimeLog(s.adminCtx, tl.ID, "")

	s.ErrorIs(err, timelogErrors.ErrInvalidFlagReason)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestFlagTimeLog_NotAdmin() {
	result, err := s.service.FlagTimeLog(s.studentCtx, uuid.New(), "reason")

	s.ErrorIs(err, timelogErrors.ErrNotAuthorized)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestFlagTimeLog_MissingAuth() {
	result, err := s.service.FlagTimeLog(context.Background(), uuid.New(), "reason")

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- Admin: UnflagTimeLog ---

func (s *TimeLogServiceTestSuite) TestUnflagTimeLog_Success() {
	fixedID := uuid.MustParse("33333333-3333-3333-3333-333333333333")
	tl, _ := aggregate.NewTimeLog(12345, -61.277, 10.642, 15.0)
	tl.ID = fixedID
	_ = tl.Flag("some reason")

	s.timeLogRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.TimeLog, error) {
		s.Equal(fixedID, id)
		return tl, nil
	}
	s.timeLogRepo.UpdateFn = func(_ context.Context, _ *sql.Tx, updated *aggregate.TimeLog) (*aggregate.TimeLog, error) {
		s.False(updated.IsFlagged)
		s.Nil(updated.FlagReason)
		return updated, nil
	}

	result, err := s.service.UnflagTimeLog(s.adminCtx, fixedID)

	s.Require().NoError(err)
	s.False(result.IsFlagged)
	s.Nil(result.FlagReason)
}

func (s *TimeLogServiceTestSuite) TestUnflagTimeLog_NotFound() {
	s.timeLogRepo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.TimeLog, error) {
		return nil, timelogErrors.ErrTimeLogNotFound
	}

	result, err := s.service.UnflagTimeLog(s.adminCtx, uuid.New())

	s.ErrorIs(err, timelogErrors.ErrTimeLogNotFound)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestUnflagTimeLog_NotAdmin() {
	result, err := s.service.UnflagTimeLog(s.studentCtx, uuid.New())

	s.ErrorIs(err, timelogErrors.ErrNotAuthorized)
	s.Nil(result)
}

func (s *TimeLogServiceTestSuite) TestUnflagTimeLog_MissingAuth() {
	result, err := s.service.UnflagTimeLog(context.Background(), uuid.New())

	s.ErrorIs(err, timelogErrors.ErrMissingAuthContext)
	s.Nil(result)
}

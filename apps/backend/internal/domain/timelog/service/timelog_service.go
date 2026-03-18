package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"time"

	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	scheduleRepo "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// ClockInInput contains the data sent by the student to clock in.
type ClockInInput struct {
	Code      string
	Longitude float64
	Latitude  float64
}

// ClockInStatus is the response for the "my status" endpoint.
type ClockInStatus struct {
	IsClockedIn  bool
	CurrentLog   *aggregate.TimeLog
	CurrentShift *ShiftInfo
}

// ShiftInfo describes a matched shift assignment.
type ShiftInfo struct {
	ShiftID   string
	Name      string
	StartTime string
	EndTime   string
}

// TimeLogServiceInterface defines the service contract.
type TimeLogServiceInterface interface {
	ClockIn(ctx context.Context, input ClockInInput) (*aggregate.TimeLog, error)
	ClockOut(ctx context.Context) (*aggregate.TimeLog, error)
	GetMyStatus(ctx context.Context) (*ClockInStatus, error)
	ListMyTimeLogs(ctx context.Context, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error)
	GenerateClockInCode(ctx context.Context, expiresInMinutes int) (*aggregate.ClockInCode, error)
	GetActiveClockInCode(ctx context.Context) (*aggregate.ClockInCode, error)
}

// TimeLogService implements TimeLogServiceInterface.
type TimeLogService struct {
	logger          *zap.Logger
	txManager       database.TxManagerInterface
	timeLogRepo     repository.TimeLogRepositoryInterface
	clockInCodeRepo repository.ClockInCodeRepositoryInterface
	scheduleRepo    scheduleRepo.ScheduleRepositoryInterface
	helpDeskLon     float64
	helpDeskLat     float64
	nowFn           func() time.Time
}

func NewTimeLogService(
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	timeLogRepo repository.TimeLogRepositoryInterface,
	clockInCodeRepo repository.ClockInCodeRepositoryInterface,
	scheduleRepo scheduleRepo.ScheduleRepositoryInterface,
	helpDeskLon, helpDeskLat float64,
) TimeLogServiceInterface {
	return &TimeLogService{
		logger:          logger,
		txManager:       txManager,
		timeLogRepo:     timeLogRepo,
		clockInCodeRepo: clockInCodeRepo,
		scheduleRepo:    scheduleRepo,
		helpDeskLon:     helpDeskLon,
		helpDeskLat:     helpDeskLat,
		nowFn:           func() time.Time { return time.Now().UTC() },
	}
}

// WithNowFn sets a custom time function, useful for testing.
func (s *TimeLogService) WithNowFn(fn func() time.Time) {
	s.nowFn = fn
}

func (s *TimeLogService) ClockIn(ctx context.Context, input ClockInInput) (*aggregate.TimeLog, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok || authCtx.StudentID == nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	studentID, err := strconv.ParseInt(*authCtx.StudentID, 10, 32)
	if err != nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	var result *aggregate.TimeLog

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		// a. Validate the clock-in code
		code, err := s.clockInCodeRepo.GetByCode(ctx, tx, input.Code)
		if err != nil {
			if errors.Is(err, timelogErrors.ErrInvalidClockInCode) {
				return timelogErrors.ErrInvalidClockInCode
			}
			return err
		}
		if code == nil || code.IsExpired() {
			return timelogErrors.ErrInvalidClockInCode
		}

		// b. Check no open log
		existing, err := s.timeLogRepo.GetOpenByStudentID(ctx, tx, int32(studentID))
		if err != nil {
			if !errors.Is(err, timelogErrors.ErrTimeLogNotFound) {
				return err
			}
		} else if existing != nil {
			return timelogErrors.ErrAlreadyClockedIn
		}

		// c. Check student has an active shift now (±10 min early)
		activeSchedule, err := s.scheduleRepo.GetActive(ctx, tx)
		if err != nil {
			if errors.Is(err, scheduleErrors.ErrNotFound) {
				return timelogErrors.ErrNoActiveShift
			}
			return err
		}
		if activeSchedule == nil {
			return timelogErrors.ErrNoActiveShift
		}

		_, hasShift, shiftErr := s.hasActiveShift(activeSchedule.Assignments, int32(studentID), s.nowFn(), 10)
		if shiftErr != nil {
			return shiftErr
		}
		if !hasShift {
			return timelogErrors.ErrNoActiveShift
		}

		// d. Calculate distance
		distanceMeters := haversineDistance(input.Latitude, input.Longitude, s.helpDeskLat, s.helpDeskLon)

		// e. Create time log
		tl, err := aggregate.NewTimeLog(int32(studentID), input.Longitude, input.Latitude, distanceMeters)
		if err != nil {
			return err
		}

		created, err := s.timeLogRepo.Create(ctx, tx, tl)
		if err != nil {
			return err
		}
		result = created
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *TimeLogService) ClockOut(ctx context.Context) (*aggregate.TimeLog, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok || authCtx.StudentID == nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	studentID, err := strconv.ParseInt(*authCtx.StudentID, 10, 32)
	if err != nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	var result *aggregate.TimeLog

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		// a. Get open log
		openLog, err := s.timeLogRepo.GetOpenByStudentID(ctx, tx, int32(studentID))
		if err != nil {
			if errors.Is(err, timelogErrors.ErrTimeLogNotFound) {
				return timelogErrors.ErrNotClockedIn
			}
			return err
		}
		if openLog == nil {
			return timelogErrors.ErrNotClockedIn
		}

		// b. Clock out
		if err := openLog.ClockOut(); err != nil {
			return err
		}

		// c. Update
		updated, err := s.timeLogRepo.Update(ctx, tx, openLog)
		if err != nil {
			return err
		}
		result = updated
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *TimeLogService) GetMyStatus(ctx context.Context) (*ClockInStatus, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok || authCtx.StudentID == nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	studentID, err := strconv.ParseInt(*authCtx.StudentID, 10, 32)
	if err != nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	status := &ClockInStatus{}

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		openLog, err := s.timeLogRepo.GetOpenByStudentID(ctx, tx, int32(studentID))
		if err != nil {
			if errors.Is(err, timelogErrors.ErrTimeLogNotFound) {
				return nil
			}
			return err
		}
		if openLog != nil {
			status.IsClockedIn = true
			status.CurrentLog = openLog

			// Look up the matching shift from active schedule
			activeSchedule, err := s.scheduleRepo.GetActive(ctx, tx)
			if err != nil {
				if !errors.Is(err, scheduleErrors.ErrNotFound) {
					return err
				}
			} else if activeSchedule != nil {
				shiftInfo, ok, shiftErr := s.hasActiveShift(activeSchedule.Assignments, int32(studentID), s.nowFn(), 10)
				if shiftErr != nil {
					return shiftErr
				}
				if ok {
					status.CurrentShift = shiftInfo
				}
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return status, nil
}

func (s *TimeLogService) ListMyTimeLogs(ctx context.Context, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok || authCtx.StudentID == nil {
		return nil, 0, timelogErrors.ErrMissingAuthContext
	}

	studentID, err := strconv.ParseInt(*authCtx.StudentID, 10, 32)
	if err != nil {
		return nil, 0, timelogErrors.ErrMissingAuthContext
	}

	sid := int32(studentID)
	filter.StudentID = &sid

	var logs []*aggregate.TimeLog
	var total int

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var err error
		logs, total, err = s.timeLogRepo.List(ctx, tx, filter)
		return err
	})

	if err != nil {
		return nil, 0, err
	}
	return logs, total, nil
}

func (s *TimeLogService) GenerateClockInCode(ctx context.Context, expiresInMinutes int) (*aggregate.ClockInCode, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	if authCtx.Role != string(userAggregate.Role_Admin) {
		return nil, timelogErrors.ErrNotAuthorized
	}

	createdBy, err := uuid.Parse(authCtx.UserID)
	if err != nil {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	code, err := aggregate.NewClockInCode(createdBy, expiresInMinutes)
	if err != nil {
		return nil, err
	}

	var result *aggregate.ClockInCode

	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		// Clean up expired codes
		if err := s.clockInCodeRepo.DeleteExpired(ctx, tx); err != nil {
			s.logger.Warn("failed to delete expired codes", zap.Error(err))
		}

		created, err := s.clockInCodeRepo.Create(ctx, tx, code)
		if err != nil {
			return err
		}
		result = created
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

func (s *TimeLogService) GetActiveClockInCode(ctx context.Context) (*aggregate.ClockInCode, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok {
		return nil, timelogErrors.ErrMissingAuthContext
	}

	if authCtx.Role != string(userAggregate.Role_Admin) {
		return nil, timelogErrors.ErrNotAuthorized
	}

	var result *aggregate.ClockInCode

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		code, err := s.clockInCodeRepo.GetActive(ctx, tx)
		if err != nil {
			return err
		}
		result = code
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// assignmentEntry represents a single entry in the schedule assignments JSON.
type assignmentEntry struct {
	AssistantID string `json:"assistant_id"`
	ShiftID     string `json:"shift_id"`
	DayOfWeek   int    `json:"day_of_week"`
	Start       string `json:"start"`
	End         string `json:"end"`
}

// hasActiveShift checks if the given student has a shift assignment right now
// (within earlyMinutes before the shift start up to the shift end).
// NOTE: Shifts that span midnight (e.g. 23:00–01:00) are not supported because
// time comparison is done lexicographically on "HH:MM:SS" strings within a single day.
func (s *TimeLogService) hasActiveShift(assignments json.RawMessage, studentID int32, now time.Time, earlyMinutes int) (*ShiftInfo, bool, error) {
	var entries []assignmentEntry
	if err := json.Unmarshal(assignments, &entries); err != nil {
		s.logger.Error("failed to unmarshal schedule assignments", zap.Error(err))
		return nil, false, fmt.Errorf("malformed schedule assignments: %w", err)
	}

	// Map Go weekday (Sunday=0) to schedule weekday (Monday=0)
	scheduleDay := (int(now.Weekday()) + 6) % 7
	currentTime := now.Format("15:04:05")

	studentIDStr := strconv.Itoa(int(studentID))

	for _, entry := range entries {
		if entry.AssistantID == studentIDStr && entry.DayOfWeek == scheduleDay {
			earlyStart := subtractMinutes(entry.Start, earlyMinutes)
			if currentTime >= earlyStart && currentTime <= entry.End {
				return &ShiftInfo{
					ShiftID:   entry.ShiftID,
					Name:      formatShiftName(scheduleDay, entry.Start, entry.End),
					StartTime: entry.Start,
					EndTime:   entry.End,
				}, true, nil
			}
		}
	}
	return nil, false, nil
}

// subtractMinutes subtracts the given number of minutes from a "HH:MM:SS"
// time string. If the result goes below "00:00:00" it clamps to "00:00:00".
func subtractMinutes(timeStr string, minutes int) string {
	t, err := time.Parse("15:04:05", timeStr)
	if err != nil {
		// Try "HH:MM" format
		t, err = time.Parse("15:04", timeStr)
		if err != nil {
			return timeStr
		}
	}
	result := t.Add(-time.Duration(minutes) * time.Minute)
	// Clamp: if the subtraction wrapped to the previous day, use midnight
	if result.Day() != t.Day() {
		return "00:00:00"
	}
	return result.Format("15:04:05")
}

var dayNames = []string{"Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"}

func formatShiftName(dayOfWeek int, start, end string) string {
	day := "Unknown"
	if dayOfWeek >= 0 && dayOfWeek < len(dayNames) {
		day = dayNames[dayOfWeek]
	}
	// Trim seconds for display
	s := trimSeconds(start)
	e := trimSeconds(end)
	return day + " " + s + "-" + e
}

func trimSeconds(t string) string {
	if len(t) == 8 && t[5] == ':' {
		return t[:5]
	}
	return t
}

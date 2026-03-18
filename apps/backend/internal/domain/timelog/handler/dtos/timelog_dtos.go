package dtos

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
)

// --- Requests ---

type ClockInRequest struct {
	Code      string  `json:"code"`
	Longitude float64 `json:"longitude"`
	Latitude  float64 `json:"latitude"`
}

type GenerateCodeRequest struct {
	ExpiresInMinutes int `json:"expires_in_minutes"`
}

// --- Responses ---

type TimeLogResponse struct {
	ID             string     `json:"id"`
	StudentID      int32      `json:"student_id"`
	EntryAt        time.Time  `json:"entry_at"`
	ExitAt         *time.Time `json:"exit_at"`
	Longitude      float64    `json:"longitude"`
	Latitude       float64    `json:"latitude"`
	DistanceMeters float64    `json:"distance_meters"`
	IsFlagged      bool       `json:"is_flagged"`
	FlagReason     *string    `json:"flag_reason"`
	CreatedAt      time.Time  `json:"created_at"`
}

type ClockInStatusResponse struct {
	IsClockedIn  bool               `json:"is_clocked_in"`
	CurrentLog   *TimeLogResponse   `json:"current_log"`
	CurrentShift *ShiftInfoResponse `json:"current_shift"`
}

type ShiftInfoResponse struct {
	ShiftID   string `json:"shift_id"`
	Name      string `json:"name"`
	StartTime string `json:"start_time"`
	EndTime   string `json:"end_time"`
}

type ClockInCodeResponse struct {
	ID        string    `json:"id"`
	Code      string    `json:"code"`
	ExpiresAt time.Time `json:"expires_at"`
	CreatedAt time.Time `json:"created_at"`
}

// --- Converters ---

func TimeLogToResponse(tl *aggregate.TimeLog) TimeLogResponse {
	return TimeLogResponse{
		ID:             tl.ID.String(),
		StudentID:      tl.StudentID,
		EntryAt:        tl.EntryAt,
		ExitAt:         tl.ExitAt,
		Longitude:      tl.Longitude,
		Latitude:       tl.Latitude,
		DistanceMeters: tl.DistanceMeters,
		IsFlagged:      tl.IsFlagged,
		FlagReason:     tl.FlagReason,
		CreatedAt:      tl.CreatedAt,
	}
}

func TimeLogsToResponse(logs []*aggregate.TimeLog) []TimeLogResponse {
	responses := make([]TimeLogResponse, len(logs))
	for i, tl := range logs {
		responses[i] = TimeLogToResponse(tl)
	}
	return responses
}

func ClockInCodeToResponse(c *aggregate.ClockInCode) ClockInCodeResponse {
	return ClockInCodeResponse{
		ID:        c.ID.String(),
		Code:      c.Code,
		ExpiresAt: c.ExpiresAt,
		CreatedAt: c.CreatedAt,
	}
}

func ClockInStatusToResponse(status *service.ClockInStatus) ClockInStatusResponse {
	resp := ClockInStatusResponse{
		IsClockedIn: status.IsClockedIn,
	}
	if status.CurrentLog != nil {
		tlr := TimeLogToResponse(status.CurrentLog)
		resp.CurrentLog = &tlr
	}
	if status.CurrentShift != nil {
		resp.CurrentShift = &ShiftInfoResponse{
			ShiftID:   status.CurrentShift.ShiftID,
			Name:      status.CurrentShift.Name,
			StartTime: status.CurrentShift.StartTime,
			EndTime:   status.CurrentShift.EndTime,
		}
	}
	return resp
}

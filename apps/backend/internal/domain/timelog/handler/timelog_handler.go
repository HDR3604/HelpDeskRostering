package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type TimeLogHandler struct {
	logger  *zap.Logger
	service service.TimeLogServiceInterface
}

func NewTimeLogHandler(logger *zap.Logger, service service.TimeLogServiceInterface) *TimeLogHandler {
	return &TimeLogHandler{
		logger:  logger,
		service: service,
	}
}

func (h *TimeLogHandler) RegisterRoutes(r chi.Router) {
	r.Post("/time-logs/clock-in", h.ClockIn)
	r.Post("/time-logs/clock-out", h.ClockOut)
	r.Get("/time-logs/me/status", h.GetMyStatus)
	r.Get("/time-logs/me", h.ListMyTimeLogs)
}

func (h *TimeLogHandler) RegisterAdminRoutes(r chi.Router) {
	r.Route("/clock-in-codes", func(r chi.Router) {
		r.Post("/", h.GenerateClockInCode)
		r.Get("/active", h.GetActiveCode)
	})

	// Individual routes (not r.Route) to avoid chi mount conflict in tests.
	r.Get("/time-logs", h.ListTimeLogs)
	r.Get("/time-logs/{id}", h.GetTimeLog)
	r.Patch("/time-logs/{id}/flag", h.FlagTimeLog)
	r.Patch("/time-logs/{id}/unflag", h.UnflagTimeLog)
}

func (h *TimeLogHandler) ClockIn(w http.ResponseWriter, r *http.Request) {
	var req dtos.ClockInRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Code == "" {
		writeError(w, http.StatusBadRequest, "code is required")
		return
	}

	if req.Longitude == 0 && req.Latitude == 0 {
		writeError(w, http.StatusBadRequest, "longitude and latitude are required")
		return
	}

	tl, err := h.service.ClockIn(r.Context(), service.ClockInInput{
		Code:      req.Code,
		Longitude: req.Longitude,
		Latitude:  req.Latitude,
	})
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.TimeLogToResponse(tl))
}

func (h *TimeLogHandler) ClockOut(w http.ResponseWriter, r *http.Request) {
	tl, err := h.service.ClockOut(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.TimeLogToResponse(tl))
}

func (h *TimeLogHandler) GetMyStatus(w http.ResponseWriter, r *http.Request) {
	status, err := h.service.GetMyStatus(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ClockInStatusToResponse(status))
}

func (h *TimeLogHandler) ListMyTimeLogs(w http.ResponseWriter, r *http.Request) {
	filter := repository.TimeLogFilter{
		Page:    1,
		PerPage: 20,
	}

	if v := r.URL.Query().Get("page"); v != "" {
		if page, err := strconv.Atoi(v); err == nil && page > 0 {
			filter.Page = page
		}
	}
	if v := r.URL.Query().Get("per_page"); v != "" {
		if pp, err := strconv.Atoi(v); err == nil && pp > 0 && pp <= 100 {
			filter.PerPage = pp
		}
	}

	logs, total, err := h.service.ListMyTimeLogs(r.Context(), filter)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data":  dtos.TimeLogsToResponse(logs),
		"total": total,
		"page":  filter.Page,
	})
}

func (h *TimeLogHandler) GenerateClockInCode(w http.ResponseWriter, r *http.Request) {
	var req dtos.GenerateCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ExpiresInMinutes <= 0 {
		req.ExpiresInMinutes = 60
	}

	code, err := h.service.GenerateClockInCode(r.Context(), req.ExpiresInMinutes)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ClockInCodeToResponse(code))
}

func (h *TimeLogHandler) GetActiveCode(w http.ResponseWriter, r *http.Request) {
	code, err := h.service.GetActiveClockInCode(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ClockInCodeToResponse(code))
}

func (h *TimeLogHandler) ListTimeLogs(w http.ResponseWriter, r *http.Request) {
	filter := repository.TimeLogFilter{
		Page:    1,
		PerPage: 50,
	}

	if v := r.URL.Query().Get("page"); v != "" {
		if page, err := strconv.Atoi(v); err == nil && page > 0 {
			filter.Page = page
		}
	}
	if v := r.URL.Query().Get("per_page"); v != "" {
		if pp, err := strconv.Atoi(v); err == nil && pp > 0 && pp <= 100 {
			filter.PerPage = pp
		}
	}
	if v := r.URL.Query().Get("student_id"); v != "" {
		if sid, err := strconv.ParseInt(v, 10, 32); err == nil {
			s := int32(sid)
			filter.StudentID = &s
		}
	}
	if v := r.URL.Query().Get("from"); v != "" {
		if t, err := time.Parse(time.DateOnly, v); err == nil {
			filter.From = &t
		}
	}
	if v := r.URL.Query().Get("to"); v != "" {
		if t, err := time.Parse(time.DateOnly, v); err == nil {
			end := t.AddDate(0, 0, 1)
			filter.To = &end
		}
	}
	if v := r.URL.Query().Get("flagged"); v != "" {
		if flagged, err := strconv.ParseBool(v); err == nil {
			filter.Flagged = &flagged
		}
	}

	logs, total, err := h.service.ListTimeLogs(r.Context(), filter)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"data":     dtos.AdminTimeLogsToResponse(logs),
		"total":    total,
		"page":     filter.Page,
		"per_page": filter.PerPage,
	})
}

func (h *TimeLogHandler) GetTimeLog(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid time log ID")
		return
	}

	tl, err := h.service.GetTimeLog(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.AdminTimeLogToResponse(tl))
}

func (h *TimeLogHandler) FlagTimeLog(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid time log ID")
		return
	}

	var req dtos.FlagTimeLogRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	trimmedReason := strings.TrimSpace(req.Reason)
	if trimmedReason == "" {
		writeError(w, http.StatusBadRequest, "reason is required")
		return
	}
	if len(trimmedReason) > 500 {
		writeError(w, http.StatusBadRequest, "reason must be 500 characters or fewer")
		return
	}
	req.Reason = trimmedReason

	tl, err := h.service.FlagTimeLog(r.Context(), id, req.Reason)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.TimeLogToResponse(tl))
}

func (h *TimeLogHandler) UnflagTimeLog(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid time log ID")
		return
	}

	tl, err := h.service.UnflagTimeLog(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.TimeLogToResponse(tl))
}

func (h *TimeLogHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, timelogErrors.ErrInvalidClockInCode):
		writeError(w, http.StatusBadRequest, "invalid or expired clock-in code")
	case errors.Is(err, timelogErrors.ErrNoActiveShift):
		writeError(w, http.StatusBadRequest, "no active shift assignment found")
	case errors.Is(err, timelogErrors.ErrAlreadyClockedIn):
		writeError(w, http.StatusConflict, "already clocked in")
	case errors.Is(err, timelogErrors.ErrNotClockedIn):
		writeError(w, http.StatusNotFound, "no open time log found")
	case errors.Is(err, timelogErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "missing auth context")
	case errors.Is(err, timelogErrors.ErrNotAuthorized):
		writeError(w, http.StatusForbidden, "not authorized")
	case errors.Is(err, timelogErrors.ErrNoActiveClockInCode):
		writeError(w, http.StatusNotFound, "no active clock-in code")
	case errors.Is(err, timelogErrors.ErrInvalidCoordinates):
		writeError(w, http.StatusBadRequest, "invalid coordinates")
	case errors.Is(err, timelogErrors.ErrTimeLogNotFound):
		writeError(w, http.StatusNotFound, "time log not found")
	case errors.Is(err, timelogErrors.ErrInvalidFlagReason):
		writeError(w, http.StatusBadRequest, "flag reason must not be empty")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

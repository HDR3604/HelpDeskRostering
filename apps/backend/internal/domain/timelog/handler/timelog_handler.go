package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/service"
	"github.com/go-chi/chi/v5"
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
	r.Route("/time-logs", func(r chi.Router) {
		r.Post("/clock-in", h.ClockIn)
		r.Post("/clock-out", h.ClockOut)
		r.Get("/me/status", h.GetMyStatus)
		r.Get("/me", h.ListMyTimeLogs)
	})
}

func (h *TimeLogHandler) RegisterAdminRoutes(r chi.Router) {
	r.Route("/clock-in-codes", func(r chi.Router) {
		r.Post("/", h.GenerateClockInCode)
		r.Get("/active", h.GetActiveCode)
	})
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

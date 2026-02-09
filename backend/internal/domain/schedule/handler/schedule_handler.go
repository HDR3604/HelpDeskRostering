package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ScheduleHandler struct {
	logger  *zap.Logger
	service service.ScheduleServiceInterface
}

func NewScheduleHandler(logger *zap.Logger, service service.ScheduleServiceInterface) *ScheduleHandler {
	return &ScheduleHandler{
		logger:  logger,
		service: service,
	}
}

func (h *ScheduleHandler) RegisterRoutes(r chi.Router) {
	r.Route("/schedules", func(r chi.Router) {
		r.Post("/", h.Create)
		r.Post("/generate", h.GenerateSchedule)
		r.Get("/", h.List)
		r.Get("/archived", h.ListArchived)
		r.Get("/{id}", h.GetByID)
		r.Patch("/{id}/archive", h.Archive)
		r.Patch("/{id}/unarchive", h.Unarchive)
		r.Patch("/{id}/activate", h.Activate)
		r.Patch("/{id}/deactivate", h.Deactivate)
	})
}

func (h *ScheduleHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dtos.CreateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	effectiveFrom, err := time.Parse("2006-01-02", req.EffectiveFrom)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid effective_from date format, expected YYYY-MM-DD")
		return
	}

	var effectiveTo *time.Time
	if req.EffectiveTo != nil {
		parsed, err := time.Parse("2006-01-02", *req.EffectiveTo)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid effective_to date format, expected YYYY-MM-DD")
			return
		}
		effectiveTo = &parsed
	}

	schedule, err := aggregate.NewSchedule(req.Title, effectiveFrom, effectiveTo)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	created, err := h.service.Create(r.Context(), schedule)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ScheduleToResponse(created))
}

func (h *ScheduleHandler) GenerateSchedule(w http.ResponseWriter, r *http.Request) {
	var req dtos.GenerateScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	configID, err := uuid.Parse(req.ConfigID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid config_id")
		return
	}

	effectiveFrom, err := time.Parse("2006-01-02", req.EffectiveFrom)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid effective_from date format, expected YYYY-MM-DD")
		return
	}

	var effectiveTo *time.Time
	if req.EffectiveTo != nil {
		parsed, err := time.Parse("2006-01-02", *req.EffectiveTo)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid effective_to date format, expected YYYY-MM-DD")
			return
		}
		effectiveTo = &parsed
	}

	params := service.GenerateScheduleParams{
		ConfigID:      configID,
		Title:         req.Title,
		EffectiveFrom: effectiveFrom,
		EffectiveTo:   effectiveTo,
		Request:       req.Request,
	}

	schedule, err := h.service.GenerateSchedule(r.Context(), params)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ScheduleToResponse(schedule))
}

func (h *ScheduleHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	schedule, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ScheduleToResponse(schedule))
}

func (h *ScheduleHandler) List(w http.ResponseWriter, r *http.Request) {
	schedules, err := h.service.List(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulesToResponse(schedules))
}

func (h *ScheduleHandler) ListArchived(w http.ResponseWriter, r *http.Request) {
	schedules, err := h.service.ListArchived(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulesToResponse(schedules))
}

func (h *ScheduleHandler) Archive(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Archive(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) Unarchive(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Unarchive(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) Activate(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Activate(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule ID")
		return
	}

	if err := h.service.Deactivate(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ScheduleHandler) parseID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, "id"))
}

func (h *ScheduleHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, scheduleErrors.ErrNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, scheduleErrors.ErrInvalidTitle),
		errors.Is(err, scheduleErrors.ErrInvalidEffectivePeriod):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, scheduleErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "unauthorized")
	case errors.Is(err, schedulerErrors.ErrSchedulerUnavailable),
		errors.Is(err, schedulerErrors.ErrSchedulerInternal):
		writeError(w, http.StatusBadGateway, "scheduler service unavailable")
	case errors.Is(err, schedulerErrors.ErrInvalidRequest):
		writeError(w, http.StatusUnprocessableEntity, err.Error())
	case errors.Is(err, schedulerErrors.ErrInfeasible):
		writeError(w, http.StatusUnprocessableEntity, "no feasible schedule found")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

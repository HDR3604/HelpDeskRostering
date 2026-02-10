package handler

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type SchedulerConfigHandler struct {
	logger  *zap.Logger
	service service.SchedulerConfigServiceInterface
}

func NewSchedulerConfigHandler(logger *zap.Logger, service service.SchedulerConfigServiceInterface) *SchedulerConfigHandler {
	return &SchedulerConfigHandler{
		logger:  logger,
		service: service,
	}
}

func (h *SchedulerConfigHandler) RegisterRoutes(r chi.Router) {
	r.Route("/scheduler-configs", func(r chi.Router) {
		r.Post("/", h.Create)
		r.Get("/", h.List)
		r.Get("/default", h.GetDefault)
		r.Get("/{id}", h.GetByID)
		r.Put("/{id}", h.Update)
		r.Patch("/{id}/set-default", h.SetDefault)
	})
}

func (h *SchedulerConfigHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dtos.CreateSchedulerConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	config, err := aggregate.NewSchedulerConfig(
		req.Name,
		req.CourseShortfallPenalty, req.MinHoursPenalty, req.MaxHoursPenalty,
		req.UnderstaffedPenalty, req.ExtraHoursPenalty, req.MaxExtraPenalty,
		req.BaselineHoursTarget,
		req.SolverTimeLimit, req.SolverGap, req.LogSolverOutput,
	)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	created, err := h.service.Create(r.Context(), config)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.SchedulerConfigToResponse(created))
}

func (h *SchedulerConfigHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid scheduler config ID")
		return
	}

	config, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulerConfigToResponse(config))
}

func (h *SchedulerConfigHandler) GetDefault(w http.ResponseWriter, r *http.Request) {
	config, err := h.service.GetDefault(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulerConfigToResponse(config))
}

func (h *SchedulerConfigHandler) List(w http.ResponseWriter, r *http.Request) {
	configs, err := h.service.List(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulerConfigsToResponse(configs))
}

func (h *SchedulerConfigHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid scheduler config ID")
		return
	}

	var req dtos.UpdateSchedulerConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	params := service.UpdateSchedulerConfigParams{
		Name:                  req.Name,
		CourseShortfallPenalty: req.CourseShortfallPenalty,
		MinHoursPenalty:       req.MinHoursPenalty,
		MaxHoursPenalty:       req.MaxHoursPenalty,
		UnderstaffedPenalty:   req.UnderstaffedPenalty,
		ExtraHoursPenalty:     req.ExtraHoursPenalty,
		MaxExtraPenalty:       req.MaxExtraPenalty,
		BaselineHoursTarget:   req.BaselineHoursTarget,
		SolverTimeLimit:       req.SolverTimeLimit,
		SolverGap:             req.SolverGap,
		LogSolverOutput:       req.LogSolverOutput,
	}

	updated, err := h.service.Update(r.Context(), id, params)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.SchedulerConfigToResponse(updated))
}

func (h *SchedulerConfigHandler) SetDefault(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid scheduler config ID")
		return
	}

	if err := h.service.SetDefault(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *SchedulerConfigHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, scheduleErrors.ErrSchedulerConfigNotFound):
		writeError(w, http.StatusNotFound, "scheduler config not found")
	case errors.Is(err, scheduleErrors.ErrInvalidConfigName):
		writeError(w, http.StatusBadRequest, "invalid config name")
	case errors.Is(err, scheduleErrors.ErrInvalidPenaltyWeight):
		writeError(w, http.StatusBadRequest, "penalty weights must be non-negative")
	case errors.Is(err, scheduleErrors.ErrInvalidBaselineHours):
		writeError(w, http.StatusBadRequest, "baseline hours target must be at least 1")
	case errors.Is(err, scheduleErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "unauthorized")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

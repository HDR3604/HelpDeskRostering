package handler

import (
	"errors"
	"net/http"

	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ScheduleGenerationHandler struct {
	logger  *zap.Logger
	service service.ScheduleGenerationServiceInterface
}

func NewScheduleGenerationHandler(logger *zap.Logger, service service.ScheduleGenerationServiceInterface) *ScheduleGenerationHandler {
	return &ScheduleGenerationHandler{
		logger:  logger,
		service: service,
	}
}

func (h *ScheduleGenerationHandler) RegisterRoutes(r chi.Router) {
	r.Route("/schedule-generations", func(r chi.Router) {
		r.Get("/", h.List)
		r.Get("/{id}", h.GetByID)
	})
}

func (h *ScheduleGenerationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid schedule generation ID")
		return
	}

	generation, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ScheduleGenerationToResponse(generation))
}

func (h *ScheduleGenerationHandler) List(w http.ResponseWriter, r *http.Request) {
	generations, err := h.service.List(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ScheduleGenerationsToResponse(generations))
}

func (h *ScheduleGenerationHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, scheduleErrors.ErrGenerationNotFound):
		writeError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, scheduleErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "unauthorized")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

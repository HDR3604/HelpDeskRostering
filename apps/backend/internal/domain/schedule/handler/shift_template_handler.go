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
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ShiftTemplateHandler struct {
	logger  *zap.Logger
	service service.ShiftTemplateServiceInterface
}

func NewShiftTemplateHandler(logger *zap.Logger, service service.ShiftTemplateServiceInterface) *ShiftTemplateHandler {
	return &ShiftTemplateHandler{
		logger:  logger,
		service: service,
	}
}

func (h *ShiftTemplateHandler) RegisterRoutes(r chi.Router) {
	r.Route("/shift-templates", func(r chi.Router) {
		r.Post("/", h.Create)
		r.Post("/bulk", h.BulkCreate)
		r.Get("/", h.List)
		r.Get("/all", h.ListAll)
		r.Get("/{id}", h.GetByID)
		r.Put("/{id}", h.Update)
		r.Patch("/{id}/activate", h.Activate)
		r.Patch("/{id}/deactivate", h.Deactivate)
	})
}

func (h *ShiftTemplateHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dtos.CreateShiftTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	startTime, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start_time format, expected HH:MM")
		return
	}

	endTime, err := time.Parse("15:04", req.EndTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end_time format, expected HH:MM")
		return
	}

	demands := dtos.CourseDemandDTOsToAggregate(req.CourseDemands)

	template, err := aggregate.NewShiftTemplate(req.Name, req.DayOfWeek, startTime, endTime, req.MinStaff, req.MaxStaff, demands)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	created, err := h.service.Create(r.Context(), template)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ShiftTemplateToResponse(created))
}

func (h *ShiftTemplateHandler) BulkCreate(w http.ResponseWriter, r *http.Request) {
	var req dtos.BulkCreateShiftTemplatesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Templates) == 0 {
		writeError(w, http.StatusBadRequest, "templates array must not be empty")
		return
	}

	templates := make([]*aggregate.ShiftTemplate, 0, len(req.Templates))
	for _, item := range req.Templates {
		startTime, err := time.Parse("15:04", item.StartTime)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid start_time format, expected HH:MM")
			return
		}

		endTime, err := time.Parse("15:04", item.EndTime)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid end_time format, expected HH:MM")
			return
		}

		demands := dtos.CourseDemandDTOsToAggregate(item.CourseDemands)

		t, err := aggregate.NewShiftTemplate(item.Name, item.DayOfWeek, startTime, endTime, item.MinStaff, item.MaxStaff, demands)
		if err != nil {
			h.handleServiceError(w, err)
			return
		}

		templates = append(templates, t)
	}

	created, err := h.service.BulkCreate(r.Context(), templates)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.ShiftTemplatesToResponse(created))
}

func (h *ShiftTemplateHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shift template ID")
		return
	}

	template, err := h.service.GetByID(r.Context(), id)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ShiftTemplateToResponse(template))
}

func (h *ShiftTemplateHandler) List(w http.ResponseWriter, r *http.Request) {
	templates, err := h.service.List(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ShiftTemplatesToResponse(templates))
}

func (h *ShiftTemplateHandler) ListAll(w http.ResponseWriter, r *http.Request) {
	templates, err := h.service.ListAll(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ShiftTemplatesToResponse(templates))
}

func (h *ShiftTemplateHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shift template ID")
		return
	}

	var req dtos.UpdateShiftTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	startTime, err := time.Parse("15:04", req.StartTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid start_time format, expected HH:MM")
		return
	}

	endTime, err := time.Parse("15:04", req.EndTime)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid end_time format, expected HH:MM")
		return
	}

	params := service.UpdateShiftTemplateParams{
		Name:          req.Name,
		DayOfWeek:     req.DayOfWeek,
		StartTime:     startTime,
		EndTime:       endTime,
		MinStaff:      req.MinStaff,
		MaxStaff:      req.MaxStaff,
		CourseDemands: dtos.CourseDemandDTOsToAggregate(req.CourseDemands),
	}

	updated, err := h.service.Update(r.Context(), id, params)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.ShiftTemplateToResponse(updated))
}

func (h *ShiftTemplateHandler) Activate(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shift template ID")
		return
	}

	if err := h.service.Activate(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ShiftTemplateHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid shift template ID")
		return
	}

	if err := h.service.Deactivate(r.Context(), id); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *ShiftTemplateHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, scheduleErrors.ErrShiftTemplateNotFound):
		writeError(w, http.StatusNotFound, "shift template not found")
	case errors.Is(err, scheduleErrors.ErrInvalidShiftTemplateName):
		writeError(w, http.StatusBadRequest, "invalid shift template name")
	case errors.Is(err, scheduleErrors.ErrInvalidDayOfWeek):
		writeError(w, http.StatusBadRequest, "day of week must be between 0 and 6")
	case errors.Is(err, scheduleErrors.ErrInvalidShiftTime):
		writeError(w, http.StatusBadRequest, "start time must be before end time")
	case errors.Is(err, scheduleErrors.ErrInvalidStaffing):
		writeError(w, http.StatusBadRequest, "invalid staffing: min staff must be at least 1 and max staff must be >= min staff")
	case errors.Is(err, scheduleErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "unauthorized")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

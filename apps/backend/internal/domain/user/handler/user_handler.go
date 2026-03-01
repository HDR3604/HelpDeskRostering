package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/dtos"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type UserHandler struct {
	logger  *zap.Logger
	service service.UserServiceInterface
}

func NewUserHandler(logger *zap.Logger, service service.UserServiceInterface) *UserHandler {
	return &UserHandler{
		logger:  logger,
		service: service,
	}
}

func (h *UserHandler) RegisterRoutes(r chi.Router) {
	r.Get("/users/{id}", h.GetByID)
	r.Put("/users/{id}", h.Update)
}

func (h *UserHandler) RegisterAdminRoutes(r chi.Router) {
	r.Post("/users", h.Create)
	r.Get("/users", h.List)
	r.Delete("/users/{id}", h.Deactivate)
}

func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dtos.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	role := aggregate.Role(req.Role)
	user, err := h.service.Create(r.Context(), req.Email, req.Password, role)
	if err != nil {
		h.handleUserError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.UserToResponse(user))
}

func (h *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user ID")
		return
	}

	user, err := h.service.GetByID(r.Context(), id.String())
	if err != nil {
		h.handleUserError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.UserToResponse(user))
}

func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user ID")
		return
	}

	var req dtos.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input := service.UpdateUserInput{}
	if req.Email != nil {
		input.Email = req.Email
	}
	if req.Role != nil {
		role := aggregate.Role(*req.Role)
		input.Role = &role
	}
	if req.IsActive != nil {
		input.IsActive = req.IsActive
	}

	if err := h.service.Update(r.Context(), id.String(), input); err != nil {
		h.handleUserError(w, err)
		return
	}

	user, err := h.service.GetByID(r.Context(), id.String())
	if err != nil {
		h.handleUserError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.UserToResponse(user))
}

func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	roleFilter := r.URL.Query().Get("role")

	var users []*aggregate.User
	var err error

	if roleFilter != "" {
		users, err = h.service.ListByRole(r.Context(), roleFilter)
	} else {
		users, err = h.service.List(r.Context())
	}
	if err != nil {
		h.handleUserError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.UsersToResponse(users))
}

func (h *UserHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid user ID")
		return
	}

	input := service.UpdateUserInput{
		IsActive: boolPtr(false),
	}
	if err := h.service.Update(r.Context(), id.String(), input); err != nil {
		h.handleUserError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func boolPtr(v bool) *bool { return &v }

func (h *UserHandler) parseID(r *http.Request) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, "id"))
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

func (h *UserHandler) handleUserError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, userErrors.ErrUserNotFound):
		writeError(w, http.StatusNotFound, "user not found")

	case errors.Is(err, userErrors.ErrEmailAlreadyExists):
		writeError(w, http.StatusConflict, "email already exists")

	case errors.Is(err, userErrors.ErrInvalidEmail):
		writeError(w, http.StatusBadRequest, "invalid email format")

	case errors.Is(err, userErrors.ErrInvalidRole):
		writeError(w, http.StatusBadRequest, "invalid role")

	case errors.Is(err, userErrors.ErrInvalidPasswordLength):
		writeError(w, http.StatusBadRequest, "password must be at least 8 characters")

	case errors.Is(err, userErrors.ErrInvalidPasswordComplexity):
		writeError(w, http.StatusBadRequest, "password does not meet complexity requirements")

	case errors.Is(err, userErrors.ErrEmailUnchanged):
		writeError(w, http.StatusBadRequest, "new email must be different from current email")

	case errors.Is(err, userErrors.ErrRoleUnchanged):
		writeError(w, http.StatusBadRequest, "new role must be different from current role")

	case errors.Is(err, userErrors.ErrEmailAdmin):
		writeError(w, http.StatusBadRequest, "admin email must end with @uwi.edu")

	case errors.Is(err, userErrors.ErrEmailStudent):
		writeError(w, http.StatusBadRequest, "student email must end with @my.uwi.edu")

	case errors.Is(err, userErrors.ErrCreateUserFailed):
		writeError(w, http.StatusInternalServerError, "failed to create user")

	case errors.Is(err, userErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "authentication required")

	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

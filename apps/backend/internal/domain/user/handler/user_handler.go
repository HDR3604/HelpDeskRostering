package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strconv"

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

func (u *UserHandler) RegisterRoutes(r chi.Router) {
	r.Post("/api/v1/users", u.Create)
	r.Get("api/v1/user/{UserID}", u.GetByID)
	r.Put("api/v1/users/{userID}", u.Update)
}
func (u *UserHandler) RegisterAdminRoutes(r chi.Router) {
	r.Get("api/v1/users", u.List)
	r.Delete("api/v1/users/{userID}", u.Deactivate)

}

func (u *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req dtos.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		u.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	rolePlaceholder, err := u.parseRole(r)
	role := *rolePlaceholder
	user, err := aggregate.NewUser(req.Email, req.Password, role)
	if err != nil {
		u.handleUserError(w, err)
	}

	writeJSON(w, http.StatusCreated, dtos.UserToResponse(user))

}
func (u *UserHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := u.parseID(r)
	if err != nil {
		u.handleUserError(w, err)
		return
	}
	idString := id.String()
	user, err := u.service.GetByID(r.Context(), idString)
	if err != nil {
		u.handleUserError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, dtos.UserToResponse(user))
}

func (u *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	var req dtos.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		u.logger.Warn("invalid request body", zap.Error(err))
		u.handleUserError(w, err)
		return
	}
	id, err := u.parseID(r)
	if err != nil {
		u.handleUserError(w, err)
	}

	user, err := u.service.GetByID(r.Context(), id.String())
	if err != nil {
		u.handleUserError(w, err)
	}
	if *req.Email != user.Email {
		err = user.UpdateEmail(*req.Email)
		if err != nil {
			u.handleUserError(w, err)
		}
	}
	if *req.IsActive && !user.IsActive {
		user.Activate()
	} else if !*req.IsActive && user.IsActive {
		user.Deactivate()
	}

	role, err := u.parseRole(r)
	if err != nil {
		u.handleUserError(w, err)
	}
	if user.Role != *role {
		user.UpdateRole(*role)
	}

	writeJSON(w, http.StatusOK, dtos.UserToResponse(user))

}

func (u *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	rolestring := r.URL.Query().Get("role")
	isActiveStr := r.URL.Query().Get("is_Active")

	if rolestring == "student" {
		writeError(w, http.StatusBadRequest, "invalid role")
		return
	}
	var isActive *bool
	if isActiveStr != "" {
		val, err := strconv.ParseBool(isActiveStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid is_active value")
			return
		}
		isActive = &val
	}
	if !*isActive {
		writeError(w, http.StatusBadRequest, "user not active")
	}

	users, err := u.service.List(r.Context())
	if err != nil {
		u.handleUserError(w, err)
	}

	writeJSON(w, http.StatusOK, dtos.UsersToResponse(users))

}

func (u *UserHandler) Deactivate(w http.ResponseWriter, r *http.Request) {
	id, err := u.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "error parsing ID")
	}
	user, err := u.service.GetByID(r.Context(), id.String())
	if err != nil {
		u.handleUserError(w, err)
	}
	if err := user.Deactivate(); err != nil {
		u.handleUserError(w, err)
	}

	writeJSON(w, http.StatusOK, "deleted user")

}

func (h *UserHandler) parseEmail(r *http.Request) (email string, err error) {
	newEmail := chi.URLParam(r, "email")
	_, err = mail.ParseAddress(newEmail)
	if err != nil {
		return "", fmt.Errorf("invalid email address: %w", err)
	}
	return newEmail, nil
}

func (h *UserHandler) parseActive(r *http.Request) (isAct *bool, err error) {
	activeStr := chi.URLParam(r, "is_active")
	isActive, err := strconv.ParseBool(activeStr)
	if err != nil {
		return nil, fmt.Errorf("Invalid Boolean Expression: %s", activeStr)
	}
	return &isActive, err
}

func (h *UserHandler) parseRole(r *http.Request) (*aggregate.Role, error) {
	newRoleString := chi.URLParam(r, "role")
	switch newRoleString {
	case "Admin":
		role := aggregate.Role_Admin
		return &role, nil
	case "Student":
		role := aggregate.Role_Student
		return &role, nil
	default:
		return nil, fmt.Errorf("invalid role type: %s", newRoleString)
	}

}
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

	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

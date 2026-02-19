package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/types/dtos"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

type AuthHandler struct {
	logger         *zap.Logger
	service        service.AuthServiceInterface
	accessTokenTTL int
}

func NewAuthHandler(logger *zap.Logger, service service.AuthServiceInterface, accessTokenTTL int) *AuthHandler {
	return &AuthHandler{
		logger:         logger,
		service:        service,
		accessTokenTTL: accessTokenTTL,
	}
}

func (h *AuthHandler) RegisterRoutes(r chi.Router) {
	r.Route("/auth", func(r chi.Router) {
		r.Post("/register", h.Register)
		r.Post("/login", h.Login)
		r.Post("/refresh", h.Refresh)
		r.Post("/logout", h.Logout)
		r.Post("/verify-email", h.VerifyEmail)
		r.Post("/resend-verification", h.ResendVerification)
		r.Post("/forgot-password", h.ForgotPassword)
		r.Post("/reset-password", h.ResetPassword)
	})
}

func (h *AuthHandler) RegisterAuthenticatedRoutes(r chi.Router) {
	r.Patch("/auth/change-password", h.ChangePassword)
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req dtos.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Role == "" {
		writeError(w, http.StatusBadRequest, "email, password, and role are required")
		return
	}

	user, err := h.service.Register(r.Context(), req.Email, req.Password, req.Role)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.UserToResponse(user))
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req dtos.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		writeError(w, http.StatusBadRequest, "email and password are required")
		return
	}

	accessToken, refreshToken, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.AuthTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    h.accessTokenTTL,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var req dtos.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	accessToken, refreshToken, err := h.service.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.AuthTokenResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		TokenType:    "Bearer",
		ExpiresIn:    h.accessTokenTTL,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var req dtos.LogoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RefreshToken == "" {
		writeError(w, http.StatusBadRequest, "refresh_token is required")
		return
	}

	if err := h.service.Logout(r.Context(), req.RefreshToken); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req dtos.VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Token == "" {
		writeError(w, http.StatusBadRequest, "token is required")
		return
	}

	if err := h.service.VerifyEmail(r.Context(), req.Token); err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.MessageResponse{Message: "email verified successfully"})
}

func (h *AuthHandler) ResendVerification(w http.ResponseWriter, r *http.Request) {
	var req dtos.ResendVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	if err := h.service.ResendVerification(r.Context(), req.Email); err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.MessageResponse{Message: "verification email sent"})
}

func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req dtos.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	if err := h.service.ForgotPassword(r.Context(), req.Email); err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.MessageResponse{Message: "if an account exists with that email, a password reset link has been sent"})
}

func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req dtos.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Token == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "token and new_password are required")
		return
	}

	if err := h.service.ResetPassword(r.Context(), req.Token, req.NewPassword); err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.MessageResponse{Message: "password has been reset successfully"})
}

func (h *AuthHandler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	ac, ok := database.AuthContextFromContext(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req dtos.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CurrentPassword == "" || req.NewPassword == "" {
		writeError(w, http.StatusBadRequest, "current_password and new_password are required")
		return
	}

	if err := h.service.ChangePassword(r.Context(), ac.UserID, req.CurrentPassword, req.NewPassword); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *AuthHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, authErrors.ErrInvalidCredentials):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, authErrors.ErrAccountInactive):
		writeError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, authErrors.ErrEmailNotVerified):
		writeError(w, http.StatusForbidden, err.Error())
	case errors.Is(err, authErrors.ErrInvalidRefreshToken):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, authErrors.ErrRefreshTokenExpired):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, authErrors.ErrTokenReuse):
		writeError(w, http.StatusUnauthorized, err.Error())
	case errors.Is(err, authErrors.ErrPasswordMismatch):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrPasswordSameAsOld):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrVerificationTokenInvalid):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrVerificationTokenExpired):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrVerificationTokenUsed):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrPasswordResetTokenInvalid):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrPasswordResetTokenExpired):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrPasswordResetTokenUsed):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, authErrors.ErrEmailAlreadyVerified):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, authErrors.ErrSendVerificationFailed):
		writeError(w, http.StatusBadGateway, err.Error())
	case errors.Is(err, userErrors.ErrEmailAlreadyExists):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, userErrors.ErrInvalidEmail):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, userErrors.ErrInvalidRole):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, userErrors.ErrInvalidPasswordLength),
		errors.Is(err, userErrors.ErrInvalidPasswordComplexity):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, userErrors.ErrEmailAdmin),
		errors.Is(err, userErrors.ErrEmailStudent):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, userErrors.ErrNotFound):
		writeError(w, http.StatusNotFound, "user not found")
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

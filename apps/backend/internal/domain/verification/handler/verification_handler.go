package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	verificationErrors "github.com/HDR3604/HelpDeskApp/internal/domain/verification/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/verification/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/verification/service"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

type VerificationHandler struct {
	logger  *zap.Logger
	service service.VerificationServiceInterface
}

func NewVerificationHandler(logger *zap.Logger, service service.VerificationServiceInterface) *VerificationHandler {
	return &VerificationHandler{
		logger:  logger,
		service: service,
	}
}

func (h *VerificationHandler) RegisterRoutes(r chi.Router) {
	r.Route("/verification", func(r chi.Router) {
		r.Post("/send-code", h.SendCode)
		r.Post("/verify-code", h.VerifyCode)
	})
}

func (h *VerificationHandler) SendCode(w http.ResponseWriter, r *http.Request) {
	var req dtos.SendCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" {
		writeError(w, http.StatusBadRequest, "email is required")
		return
	}

	if err := h.service.SendCode(r.Context(), req.Email); err != nil {
		h.handleServiceError(w, err)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *VerificationHandler) VerifyCode(w http.ResponseWriter, r *http.Request) {
	var req dtos.VerifyCodeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Code == "" {
		writeError(w, http.StatusBadRequest, "email and code are required")
		return
	}

	if err := h.service.VerifyCode(r.Context(), req.Email, req.Code); err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.VerifyCodeResponse{Verified: true})
}

func (h *VerificationHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, verificationErrors.ErrInvalidCode):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, verificationErrors.ErrAlreadyVerified):
		writeError(w, http.StatusConflict, err.Error())
	case errors.Is(err, verificationErrors.ErrEmailRequired):
		writeError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, verificationErrors.ErrCodeRequired):
		writeError(w, http.StatusBadRequest, err.Error())
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

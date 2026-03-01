package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
	"github.com/go-chi/chi/v5"
	"go.uber.org/zap"
)

type StudentHandler struct {
	logger  *zap.Logger
	service service.BankingDetailsServiceInterface
}

func NewStudentHandler(logger *zap.Logger, service service.BankingDetailsServiceInterface) *StudentHandler {
	return &StudentHandler{
		logger:  logger,
		service: service,
	}
}

func (h *StudentHandler) RegisterRoutes(r chi.Router) {
	r.Route("/students", func(r chi.Router) {
		r.Route("/me", func(r chi.Router) {
			r.Get("/banking-details", h.GetMyBankingDetails)
			r.Put("/banking-details", h.UpsertMyBankingDetails)
		})
		r.Route("/{studentID}", func(r chi.Router) {
			r.Get("/banking-details", h.GetBankingDetails)
			r.Put("/banking-details", h.UpsertBankingDetails)
		})
	})
}

func (h *StudentHandler) GetMyBankingDetails(w http.ResponseWriter, r *http.Request) {
	bankingDetails, err := h.service.GetMyBankingDetails(r.Context())
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.BankingDetailsToResponse(bankingDetails))
}

func (h *StudentHandler) UpsertMyBankingDetails(w http.ResponseWriter, r *http.Request) {
	var req dtos.UpsertBankingDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input := service.UpsertBankingDetailsInput{
		BankName:      req.BankName,
		BranchName:    req.BranchName,
		AccountType:   req.AccountType,
		AccountNumber: req.AccountNumber,
	}

	bankingDetails, err := h.service.UpsertMyBankingDetails(r.Context(), input)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.BankingDetailsToResponse(bankingDetails))
}

func (h *StudentHandler) GetBankingDetails(w http.ResponseWriter, r *http.Request) {
	studentIDStr := chi.URLParam(r, "studentID")
	studentID, err := strconv.ParseInt(studentIDStr, 10, 32)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student ID")
		return
	}

	bankingDetails, err := h.service.GetBankingDetailsByStudentID(r.Context(), int32(studentID))
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.BankingDetailsToResponse(bankingDetails))
}

func (h *StudentHandler) UpsertBankingDetails(w http.ResponseWriter, r *http.Request) {
	studentIDStr := chi.URLParam(r, "studentID")
	studentID, err := strconv.ParseInt(studentIDStr, 10, 32)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student ID")
		return
	}

	var req dtos.UpsertBankingDetailsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	input := service.UpsertBankingDetailsInput{
		BankName:      req.BankName,
		BranchName:    req.BranchName,
		AccountType:   req.AccountType,
		AccountNumber: req.AccountNumber,
	}

	bankingDetails, err := h.service.UpsertBankingDetailsByStudentID(r.Context(), int32(studentID), input)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.BankingDetailsToResponse(bankingDetails))
}

func (h *StudentHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, studentErrors.ErrBankingDetailsNotFound):
		writeError(w, http.StatusNotFound, "banking details not found")
	case errors.Is(err, studentErrors.ErrStudentNotFound):
		writeError(w, http.StatusNotFound, "student not found")
	case errors.Is(err, studentErrors.ErrInvalidBankName):
		writeError(w, http.StatusBadRequest, "invalid bank name (cannot be empty)")
	case errors.Is(err, studentErrors.ErrInvalidBranchName):
		writeError(w, http.StatusBadRequest, "invalid branch name (cannot be empty)")
	case errors.Is(err, studentErrors.ErrInvalidAccountType):
		writeError(w, http.StatusBadRequest, "invalid account type (must be 'chequeing' or 'savings')")
	case errors.Is(err, studentErrors.ErrInvalidAccountNumber):
		writeError(w, http.StatusBadRequest, "invalid account number (must be 7-16 digits)")
	case errors.Is(err, studentErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "authentication required")
	case errors.Is(err, studentErrors.ErrNotAuthorized):
		writeError(w, http.StatusUnauthorized, "not authorized to perform this action")
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

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
	logger         *zap.Logger
	bankingService service.BankingDetailsServiceInterface
	studentService service.StudentServiceInterface
}

func NewStudentHandler(logger *zap.Logger, bankingSvc service.BankingDetailsServiceInterface, studentSvc service.StudentServiceInterface) *StudentHandler {
	return &StudentHandler{
		logger:         logger,
		bankingService: bankingSvc,
		studentService: studentSvc,
	}
}

// RegisterPublicRoutes registers unauthenticated routes.
func (h *StudentHandler) RegisterPublicRoutes(r chi.Router) {
	r.Post("/students", h.Apply)
}

// RegisterAdminRoutes registers admin-only routes.
func (h *StudentHandler) RegisterAdminRoutes(r chi.Router) {
	r.Get("/students", h.List)
	r.Get("/students/{id}", h.GetByID)
	r.Patch("/students/{id}/accept", h.Accept)
	r.Patch("/students/{id}/reject", h.Reject)
	r.Get("/students/{studentID}/banking-details", h.GetBankingDetails)
	r.Put("/students/{studentID}/banking-details", h.UpsertBankingDetails)
}

// RegisterRoutes registers authenticated routes (any role).
func (h *StudentHandler) RegisterRoutes(r chi.Router) {
	r.Get("/students/me", h.GetMe)
	r.Put("/students/me", h.UpdateMe)
	r.Get("/students/me/banking-details", h.GetMyBankingDetails)
	r.Put("/students/me/banking-details", h.UpsertMyBankingDetails)
}

// --- Student application handlers ---

func (h *StudentHandler) Apply(w http.ResponseWriter, r *http.Request) {
	var req dtos.ApplyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	metadata, err := req.ToTranscriptMetadata()
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	student, err := h.studentService.Apply(r.Context(), service.ApplyInput{
		Email:              req.Email,
		PhoneNumber:        req.PhoneNumber,
		TranscriptMetadata: metadata,
		Availability:       req.Availability,
	})
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.StudentToResponse(student))
}

func (h *StudentHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student ID")
		return
	}

	student, err := h.studentService.GetByID(r.Context(), id)
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.StudentToResponse(student))
}

func (h *StudentHandler) List(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")

	students, err := h.studentService.List(r.Context(), status)
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.StudentsToResponse(students))
}

func (h *StudentHandler) Accept(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student ID")
		return
	}

	student, err := h.studentService.Accept(r.Context(), id)
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.StudentToResponse(student))
}

func (h *StudentHandler) Reject(w http.ResponseWriter, r *http.Request) {
	id, err := h.parseID(r)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid student ID")
		return
	}

	student, err := h.studentService.Reject(r.Context(), id)
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.StudentToResponse(student))
}

func (h *StudentHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		writeError(w, http.StatusBadRequest, "email query parameter required")
		return
	}

	student, err := h.studentService.GetByEmail(r.Context(), email)
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.StudentToResponse(student))
}

func (h *StudentHandler) UpdateMe(w http.ResponseWriter, r *http.Request) {
	email := r.URL.Query().Get("email")
	if email == "" {
		writeError(w, http.StatusBadRequest, "email query parameter required")
		return
	}

	student, err := h.studentService.GetByEmail(r.Context(), email)
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	var req dtos.UpdateStudentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.logger.Warn("invalid request body", zap.Error(err))
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updated, err := h.studentService.Update(r.Context(), student.StudentID, service.UpdateStudentInput{
		PhoneNumber:    req.PhoneNumber,
		Availability:   req.Availability,
		MinWeeklyHours: req.MinWeeklyHours,
		MaxWeeklyHours: req.MaxWeeklyHours,
	})
	if err != nil {
		h.handleStudentError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.StudentToResponse(updated))
}

// --- Banking details handlers ---

func (h *StudentHandler) GetMyBankingDetails(w http.ResponseWriter, r *http.Request) {
	bankingDetails, err := h.bankingService.GetMyBankingDetails(r.Context())
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

	bankingDetails, err := h.bankingService.UpsertMyBankingDetails(r.Context(), input)
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

	bankingDetails, err := h.bankingService.GetBankingDetailsByStudentID(r.Context(), int32(studentID))
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

	bankingDetails, err := h.bankingService.UpsertBankingDetailsByStudentID(r.Context(), int32(studentID), input)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.BankingDetailsToResponse(bankingDetails))
}

// --- Helpers ---

func (h *StudentHandler) parseID(r *http.Request) (int32, error) {
	idStr := chi.URLParam(r, "id")
	id, err := strconv.ParseInt(idStr, 10, 32)
	if err != nil {
		return 0, err
	}
	return int32(id), nil
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
	case errors.Is(err, studentErrors.ErrInvalidAuthContext):
		h.logger.Error("invalid auth context data", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	case errors.Is(err, studentErrors.ErrNotAuthorized):
		writeError(w, http.StatusForbidden, "not authorized to perform this action")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

func (h *StudentHandler) handleStudentError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, studentErrors.ErrNotFound):
		writeError(w, http.StatusNotFound, "student not found")
	case errors.Is(err, studentErrors.ErrAlreadyExists):
		writeError(w, http.StatusConflict, "student application already exists")
	case errors.Is(err, studentErrors.ErrAlreadyAccepted):
		writeError(w, http.StatusConflict, "student application already accepted")
	case errors.Is(err, studentErrors.ErrAlreadyRejected):
		writeError(w, http.StatusConflict, "student application already rejected")
	case errors.Is(err, studentErrors.ErrDeleted):
		writeError(w, http.StatusGone, "student has been deleted")
	case errors.Is(err, studentErrors.ErrInvalidEmail):
		writeError(w, http.StatusBadRequest, "invalid email: must end with @my.uwi.edu")
	case errors.Is(err, studentErrors.ErrInvalidPhone):
		writeError(w, http.StatusBadRequest, "invalid phone number")
	case errors.Is(err, studentErrors.ErrInvalidStudentID):
		writeError(w, http.StatusBadRequest, "invalid student ID")
	case errors.Is(err, studentErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "authentication required")
	default:
		h.logger.Error("unhandled service error", zap.Error(err))
		writeError(w, http.StatusInternalServerError, "internal server error")
	}
}

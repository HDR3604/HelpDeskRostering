package handler

import (
	"encoding/csv"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	payrollErrors "github.com/HDR3604/HelpDeskApp/internal/domain/payroll/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/handler/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/service"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type PayrollHandler struct {
	logger  *zap.Logger
	service service.PayrollServiceInterface
}

func NewPayrollHandler(logger *zap.Logger, service service.PayrollServiceInterface) *PayrollHandler {
	return &PayrollHandler{
		logger:  logger,
		service: service,
	}
}

func (h *PayrollHandler) RegisterAdminRoutes(r chi.Router) {
	r.Route("/payments", func(r chi.Router) {
		r.Get("/", h.ListPayments)
		r.Post("/generate", h.GeneratePayments)
		r.Post("/{paymentId}/process", h.ProcessPayment)
		r.Post("/{paymentId}/revert", h.RevertPayment)
		r.Post("/bulk-process", h.BulkProcessPayments)
		r.Get("/export", h.ExportPayments)
	})
}

func (h *PayrollHandler) ListPayments(w http.ResponseWriter, r *http.Request) {
	periodStart := r.URL.Query().Get("period_start")
	periodEnd := r.URL.Query().Get("period_end")

	if periodStart == "" || periodEnd == "" {
		writeError(w, http.StatusBadRequest, "period_start and period_end are required")
		return
	}

	start, err := time.Parse("2006-01-02", periodStart)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid period_start format (expected YYYY-MM-DD)")
		return
	}

	end, err := time.Parse("2006-01-02", periodEnd)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid period_end format (expected YYYY-MM-DD)")
		return
	}

	payments, err := h.service.ListPayments(r.Context(), start, end)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.PaymentsToResponse(payments))
}

func (h *PayrollHandler) GeneratePayments(w http.ResponseWriter, r *http.Request) {
	var req dtos.GeneratePaymentsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	start, err := time.Parse("2006-01-02", req.PeriodStart)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid period_start format (expected YYYY-MM-DD)")
		return
	}

	end, err := time.Parse("2006-01-02", req.PeriodEnd)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid period_end format (expected YYYY-MM-DD)")
		return
	}

	payments, err := h.service.GeneratePayments(r.Context(), start, end)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusCreated, dtos.PaymentsToResponse(payments))
}

func (h *PayrollHandler) ProcessPayment(w http.ResponseWriter, r *http.Request) {
	paymentID, err := uuid.Parse(chi.URLParam(r, "paymentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid payment ID")
		return
	}

	payment, err := h.service.ProcessPayment(r.Context(), paymentID)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.PaymentToResponse(payment))
}

func (h *PayrollHandler) RevertPayment(w http.ResponseWriter, r *http.Request) {
	paymentID, err := uuid.Parse(chi.URLParam(r, "paymentId"))
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid payment ID")
		return
	}

	payment, err := h.service.RevertPayment(r.Context(), paymentID)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.PaymentToResponse(payment))
}

func (h *PayrollHandler) BulkProcessPayments(w http.ResponseWriter, r *http.Request) {
	var req dtos.BulkProcessRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.PaymentIDs) == 0 {
		writeError(w, http.StatusBadRequest, "payment_ids is required")
		return
	}

	ids := make([]uuid.UUID, len(req.PaymentIDs))
	for i, idStr := range req.PaymentIDs {
		id, err := uuid.Parse(idStr)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid payment ID: "+idStr)
			return
		}
		ids[i] = id
	}

	payments, err := h.service.BulkProcessPayments(r.Context(), ids)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	writeJSON(w, http.StatusOK, dtos.PaymentsToResponse(payments))
}

func (h *PayrollHandler) ExportPayments(w http.ResponseWriter, r *http.Request) {
	periodStart := r.URL.Query().Get("period_start")
	periodEnd := r.URL.Query().Get("period_end")

	if periodStart == "" || periodEnd == "" {
		writeError(w, http.StatusBadRequest, "period_start and period_end are required")
		return
	}

	start, err := time.Parse("2006-01-02", periodStart)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid period_start format (expected YYYY-MM-DD)")
		return
	}

	end, err := time.Parse("2006-01-02", periodEnd)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid period_end format (expected YYYY-MM-DD)")
		return
	}

	rows, err := h.service.ExportPayments(r.Context(), start, end)
	if err != nil {
		h.handleServiceError(w, err)
		return
	}

	filename := fmt.Sprintf("payroll_%s_%s.csv", periodStart, periodEnd)
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	w.WriteHeader(http.StatusOK)

	writer := csv.NewWriter(w)
	defer writer.Flush()

	header := []string{
		"Student ID",
		"First Name",
		"Last Name",
		"Programme",
		"Period Start",
		"Period End",
		"Hours Worked",
		"Rate",
		"Gross Amount",
		"Status",
		"Processed At",
		"Bank Name",
		"Branch Name",
		"Account Type",
		"Account Number",
	}
	if err := writer.Write(header); err != nil {
		h.logger.Error("failed to write CSV header", zap.Error(err))
		return
	}

	for _, row := range rows {
		firstName := ""
		lastName := ""
		programme := ""
		if row.Student != nil {
			firstName = row.Student.FirstName
			lastName = row.Student.LastName
			programme = row.Student.TranscriptMetadata.CurrentProgramme
		}

		status := "Pending"
		processedAt := ""
		if row.Payment.ProcessedAt != nil {
			status = "Processed"
			processedAt = row.Payment.ProcessedAt.Format(time.RFC3339)
		}

		bankName := ""
		branchName := ""
		accountType := ""
		accountNumber := ""
		if row.BankingDetails != nil {
			bankName = row.BankingDetails.BankName
			branchName = row.BankingDetails.BranchName
			accountType = string(row.BankingDetails.AccountType)
			accountNumber = row.BankingDetails.AccountNumber
		}

		record := []string{
			fmt.Sprintf("%d", row.Payment.StudentID),
			firstName,
			lastName,
			programme,
			row.Payment.PeriodStart.Format("2006-01-02"),
			row.Payment.PeriodEnd.Format("2006-01-02"),
			fmt.Sprintf("%.2f", row.Payment.HoursWorked),
			fmt.Sprintf("%.2f", service.HourlyRate),
			fmt.Sprintf("%.2f", row.Payment.GrossAmount),
			status,
			processedAt,
			bankName,
			branchName,
			accountType,
			accountNumber,
		}
		if err := writer.Write(record); err != nil {
			h.logger.Error("failed to write CSV row", zap.Error(err))
			return
		}
	}
}

func (h *PayrollHandler) handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, payrollErrors.ErrPaymentNotFound):
		writeError(w, http.StatusNotFound, "payment not found")
	case errors.Is(err, payrollErrors.ErrDuplicatePayment):
		writeError(w, http.StatusConflict, "payment already exists for this student and period")
	case errors.Is(err, payrollErrors.ErrAlreadyProcessed):
		writeError(w, http.StatusConflict, "payment has already been processed")
	case errors.Is(err, payrollErrors.ErrNotProcessed):
		writeError(w, http.StatusConflict, "payment has not been processed")
	case errors.Is(err, payrollErrors.ErrInvalidPeriod):
		writeError(w, http.StatusBadRequest, "invalid payment period")
	case errors.Is(err, payrollErrors.ErrMissingAuthContext):
		writeError(w, http.StatusUnauthorized, "missing auth context")
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

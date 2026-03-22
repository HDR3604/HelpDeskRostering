package dtos

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/aggregate"
)

// --- Requests ---

type GeneratePaymentsRequest struct {
	PeriodStart string `json:"period_start"`
	PeriodEnd   string `json:"period_end"`
}

type BulkProcessRequest struct {
	PaymentIDs []string `json:"payment_ids"`
}

// --- Responses ---

type PaymentResponse struct {
	PaymentID   string     `json:"payment_id"`
	StudentID   int32      `json:"student_id"`
	PeriodStart string     `json:"period_start"`
	PeriodEnd   string     `json:"period_end"`
	HoursWorked float64    `json:"hours_worked"`
	GrossAmount float64    `json:"gross_amount"`
	ProcessedAt *time.Time `json:"processed_at"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   *time.Time `json:"updated_at"`
}

// --- Converters ---

func PaymentToResponse(p *aggregate.Payment) PaymentResponse {
	return PaymentResponse{
		PaymentID:   p.PaymentID.String(),
		StudentID:   p.StudentID,
		PeriodStart: p.PeriodStart.Format("2006-01-02"),
		PeriodEnd:   p.PeriodEnd.Format("2006-01-02"),
		HoursWorked: p.HoursWorked,
		GrossAmount: p.GrossAmount,
		ProcessedAt: p.ProcessedAt,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

func PaymentsToResponse(payments []*aggregate.Payment) []PaymentResponse {
	responses := make([]PaymentResponse, len(payments))
	for i, p := range payments {
		responses[i] = PaymentToResponse(p)
	}
	return responses
}

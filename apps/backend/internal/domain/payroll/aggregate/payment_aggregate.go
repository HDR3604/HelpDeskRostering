package aggregate

import (
	"time"

	payrollErrors "github.com/HDR3604/HelpDeskApp/internal/domain/payroll/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/google/uuid"
)

type Payment struct {
	PaymentID   uuid.UUID
	StudentID   int32
	PeriodStart time.Time
	PeriodEnd   time.Time
	HoursWorked float64
	GrossAmount float64
	ProcessedAt *time.Time
	CreatedAt   time.Time
	UpdatedAt   *time.Time
}

func NewPayment(studentID int32, periodStart, periodEnd time.Time, hoursWorked, grossAmount float64) (*Payment, error) {
	if !periodEnd.After(periodStart) {
		return nil, payrollErrors.ErrInvalidPeriod
	}

	return &Payment{
		PaymentID:   uuid.New(),
		StudentID:   studentID,
		PeriodStart: periodStart,
		PeriodEnd:   periodEnd,
		HoursWorked: hoursWorked,
		GrossAmount: grossAmount,
	}, nil
}

func (p *Payment) MarkProcessed() error {
	if p.ProcessedAt != nil {
		return payrollErrors.ErrAlreadyProcessed
	}
	now := time.Now().UTC()
	p.ProcessedAt = &now
	return nil
}

func (p *Payment) RevertProcessed() error {
	if p.ProcessedAt == nil {
		return payrollErrors.ErrNotProcessed
	}
	p.ProcessedAt = nil
	return nil
}

func PaymentFromModel(m model.Payments) Payment {
	return Payment{
		PaymentID:   m.PaymentID,
		StudentID:   m.StudentID,
		PeriodStart: m.PeriodStart,
		PeriodEnd:   m.PeriodEnd,
		HoursWorked: m.HoursWorked,
		GrossAmount: m.GrossAmount,
		ProcessedAt: m.ProcessedAt,
		CreatedAt:   m.CreatedAt,
		UpdatedAt:   m.UpdatedAt,
	}
}

func (p *Payment) ToModel() model.Payments {
	return model.Payments{
		PaymentID:   p.PaymentID,
		StudentID:   p.StudentID,
		PeriodStart: p.PeriodStart,
		PeriodEnd:   p.PeriodEnd,
		HoursWorked: p.HoursWorked,
		GrossAmount: p.GrossAmount,
		ProcessedAt: p.ProcessedAt,
		CreatedAt:   p.CreatedAt,
		UpdatedAt:   p.UpdatedAt,
	}
}

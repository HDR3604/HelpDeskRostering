package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/aggregate"
	"github.com/google/uuid"
)

type PaymentFilter struct {
	PeriodStart *time.Time
	PeriodEnd   *time.Time
	StudentID   *int32
}

type PaymentRepositoryInterface interface {
	Upsert(ctx context.Context, tx *sql.Tx, payment *aggregate.Payment) (*aggregate.Payment, error)
	GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Payment, error)
	ListByPeriod(ctx context.Context, tx *sql.Tx, filter PaymentFilter) ([]*aggregate.Payment, error)
	Update(ctx context.Context, tx *sql.Tx, payment *aggregate.Payment) (*aggregate.Payment, error)
	CalculateHoursForPeriod(ctx context.Context, tx *sql.Tx, studentID int32, periodStart, periodEnd time.Time) (float64, error)
	CalculateHoursBatch(ctx context.Context, tx *sql.Tx, studentIDs []int32, periodStart, periodEnd time.Time) (map[int32]float64, error)
}

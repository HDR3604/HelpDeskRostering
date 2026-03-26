package payroll

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/aggregate"
	payrollErrors "github.com/HDR3604/HelpDeskApp/internal/domain/payroll/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/repository"
	authModel "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	authTable "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	scheduleTable "github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

var _ repository.PaymentRepositoryInterface = (*PaymentRepository)(nil)

type PaymentRepository struct {
	logger *zap.Logger
}

func NewPaymentRepository(logger *zap.Logger) repository.PaymentRepositoryInterface {
	return &PaymentRepository{
		logger: logger,
	}
}

func (r *PaymentRepository) Upsert(ctx context.Context, tx *sql.Tx, payment *aggregate.Payment) (*aggregate.Payment, error) {
	m := payment.ToModel()

	stmt := authTable.Payments.INSERT(
		authTable.Payments.PaymentID,
		authTable.Payments.StudentID,
		authTable.Payments.PeriodStart,
		authTable.Payments.PeriodEnd,
		authTable.Payments.HoursWorked,
		authTable.Payments.GrossAmount,
	).MODEL(m).
		ON_CONFLICT(authTable.Payments.StudentID, authTable.Payments.PeriodStart, authTable.Payments.PeriodEnd).
		DO_UPDATE(
			postgres.SET(
				authTable.Payments.HoursWorked.SET(authTable.Payments.EXCLUDED.HoursWorked),
				authTable.Payments.GrossAmount.SET(authTable.Payments.EXCLUDED.GrossAmount),
			),
		).RETURNING(authTable.Payments.AllColumns)

	var result authModel.Payments
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to upsert payment", zap.Error(err))
		return nil, fmt.Errorf("failed to upsert payment: %w", err)
	}

	p := aggregate.PaymentFromModel(result)
	return &p, nil
}

func (r *PaymentRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Payment, error) {
	stmt := authTable.Payments.
		SELECT(authTable.Payments.AllColumns).
		WHERE(authTable.Payments.PaymentID.EQ(postgres.UUID(id)))

	var result authModel.Payments
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, payrollErrors.ErrPaymentNotFound
		}
		r.logger.Error("failed to get payment by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("failed to get payment by ID: %w", err)
	}

	p := aggregate.PaymentFromModel(result)
	return &p, nil
}

func (r *PaymentRepository) ListByPeriod(ctx context.Context, tx *sql.Tx, filter repository.PaymentFilter) ([]*aggregate.Payment, error) {
	condition := postgres.Bool(true)

	if filter.PeriodStart != nil {
		condition = condition.AND(authTable.Payments.PeriodStart.EQ(postgres.DateT(*filter.PeriodStart)))
	}
	if filter.PeriodEnd != nil {
		condition = condition.AND(authTable.Payments.PeriodEnd.EQ(postgres.DateT(*filter.PeriodEnd)))
	}
	if filter.StudentID != nil {
		condition = condition.AND(authTable.Payments.StudentID.EQ(postgres.Int32(*filter.StudentID)))
	}

	stmt := authTable.Payments.
		SELECT(authTable.Payments.AllColumns).
		WHERE(condition).
		ORDER_BY(authTable.Payments.StudentID.ASC())

	var results []authModel.Payments
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.Payment{}, nil
		}
		r.logger.Error("failed to list payments", zap.Error(err))
		return nil, fmt.Errorf("failed to list payments: %w", err)
	}

	return toPaymentAggregates(results), nil
}

func (r *PaymentRepository) Update(ctx context.Context, tx *sql.Tx, payment *aggregate.Payment) (*aggregate.Payment, error) {
	m := payment.ToModel()

	stmt := authTable.Payments.UPDATE(
		authTable.Payments.ProcessedAt,
	).SET(
		m.ProcessedAt,
	).WHERE(
		authTable.Payments.PaymentID.EQ(postgres.UUID(m.PaymentID)),
	).RETURNING(authTable.Payments.AllColumns)

	var result authModel.Payments
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, payrollErrors.ErrPaymentNotFound
		}
		r.logger.Error("failed to update payment", zap.Error(err), zap.String("id", payment.PaymentID.String()))
		return nil, fmt.Errorf("failed to update payment: %w", err)
	}

	p := aggregate.PaymentFromModel(result)
	return &p, nil
}

func (r *PaymentRepository) CalculateHoursForPeriod(ctx context.Context, tx *sql.Tx, studentID int32, periodStart, periodEnd time.Time) (float64, error) {
	// Calculate total hours from completed time logs within the period.
	// Uses EXTRACT(EPOCH FROM (exit_at - entry_at)) / 3600 to get hours.
	stmt := scheduleTable.TimeLogs.
		SELECT(
			postgres.COALESCE(
				postgres.SUM(
					postgres.RawFloat("EXTRACT(EPOCH FROM (schedule.time_logs.exit_at - schedule.time_logs.entry_at)) / 3600.0"),
				),
				postgres.Float(0),
			).AS("total_hours"),
		).
		WHERE(
			scheduleTable.TimeLogs.StudentID.EQ(postgres.Int32(studentID)).
				AND(scheduleTable.TimeLogs.EntryAt.GT_EQ(postgres.TimestampzT(periodStart))).
				AND(scheduleTable.TimeLogs.EntryAt.LT(postgres.TimestampzT(periodEnd.AddDate(0, 0, 1)))).
				AND(scheduleTable.TimeLogs.ExitAt.IS_NOT_NULL()).
				AND(scheduleTable.TimeLogs.IsFlagged.EQ(postgres.Bool(false))),
		)

	var result struct {
		TotalHours float64 `alias:"total_hours"`
	}
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return 0, nil
		}
		r.logger.Error("failed to calculate hours", zap.Error(err), zap.Int32("student_id", studentID))
		return 0, fmt.Errorf("failed to calculate hours for period: %w", err)
	}

	// Round to 2 decimal places
	return float64(int(result.TotalHours*100)) / 100, nil
}

func (r *PaymentRepository) CalculateHoursBatch(ctx context.Context, tx *sql.Tx, studentIDs []int32, periodStart, periodEnd time.Time) (map[int32]float64, error) {
	result := make(map[int32]float64, len(studentIDs))
	if len(studentIDs) == 0 {
		return result, nil
	}

	expressions := make([]postgres.Expression, len(studentIDs))
	for i, id := range studentIDs {
		expressions[i] = postgres.Int32(id)
	}

	stmt := scheduleTable.TimeLogs.
		SELECT(
			scheduleTable.TimeLogs.StudentID,
			postgres.COALESCE(
				postgres.SUM(
					postgres.RawFloat("EXTRACT(EPOCH FROM (schedule.time_logs.exit_at - schedule.time_logs.entry_at)) / 3600.0"),
				),
				postgres.Float(0),
			).AS("total_hours"),
		).
		WHERE(
			scheduleTable.TimeLogs.StudentID.IN(expressions...).
				AND(scheduleTable.TimeLogs.EntryAt.GT_EQ(postgres.TimestampzT(periodStart))).
				AND(scheduleTable.TimeLogs.EntryAt.LT(postgres.TimestampzT(periodEnd.AddDate(0, 0, 1)))).
				AND(scheduleTable.TimeLogs.ExitAt.IS_NOT_NULL()).
				AND(scheduleTable.TimeLogs.IsFlagged.EQ(postgres.Bool(false))),
		).
		GROUP_BY(scheduleTable.TimeLogs.StudentID)

	var rows []struct {
		StudentID  int32   `sql:"primary_key" alias:"time_logs.student_id"`
		TotalHours float64 `alias:"total_hours"`
	}
	err := stmt.QueryContext(ctx, tx, &rows)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return result, nil
		}
		r.logger.Error("failed to batch calculate hours", zap.Error(err))
		return nil, fmt.Errorf("failed to batch calculate hours: %w", err)
	}

	for _, row := range rows {
		// Round to 2 decimal places
		result[row.StudentID] = float64(int(row.TotalHours*100)) / 100
	}

	return result, nil
}

func toPaymentAggregates(models []authModel.Payments) []*aggregate.Payment {
	payments := make([]*aggregate.Payment, len(models))
	for i, m := range models {
		p := aggregate.PaymentFromModel(m)
		payments[i] = &p
	}
	return payments
}

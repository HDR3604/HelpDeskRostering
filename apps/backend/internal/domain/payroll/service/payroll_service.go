package service

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/aggregate"
	payrollErrors "github.com/HDR3604/HelpDeskApp/internal/domain/payroll/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/payroll/repository"
	studentAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentRepo "github.com/HDR3604/HelpDeskApp/internal/domain/student/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

const HourlyRate = 20.00

// ExportRow combines payment data with student and banking details for CSV export.
type ExportRow struct {
	Payment        *aggregate.Payment
	Student        *studentAggregate.Student
	BankingDetails *studentAggregate.BankingDetails // nil if not on file
}

type PayrollServiceInterface interface {
	ListPayments(ctx context.Context, periodStart, periodEnd time.Time) ([]*aggregate.Payment, error)
	GeneratePayments(ctx context.Context, periodStart, periodEnd time.Time) ([]*aggregate.Payment, error)
	ProcessPayment(ctx context.Context, paymentID uuid.UUID) (*aggregate.Payment, error)
	RevertPayment(ctx context.Context, paymentID uuid.UUID) (*aggregate.Payment, error)
	BulkProcessPayments(ctx context.Context, paymentIDs []uuid.UUID) ([]*aggregate.Payment, error)
	ExportPayments(ctx context.Context, periodStart, periodEnd time.Time) ([]*ExportRow, error)
}

type PayrollService struct {
	logger             *zap.Logger
	txManager          database.TxManagerInterface
	paymentRepo        repository.PaymentRepositoryInterface
	studentRepo        studentRepo.StudentRepositoryInterface
	bankingDetailsRepo studentRepo.BankingDetailsRepositoryInterface
}

func NewPayrollService(
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	paymentRepo repository.PaymentRepositoryInterface,
	studentRepo studentRepo.StudentRepositoryInterface,
	bankingDetailsRepo studentRepo.BankingDetailsRepositoryInterface,
) PayrollServiceInterface {
	return &PayrollService{
		logger:             logger,
		txManager:          txManager,
		paymentRepo:        paymentRepo,
		studentRepo:        studentRepo,
		bankingDetailsRepo: bankingDetailsRepo,
	}
}

func (s *PayrollService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, payrollErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

// ListPayments uses InAuthTx so RLS scopes the SELECT (admins see all via policy).
func (s *PayrollService) ListPayments(ctx context.Context, periodStart, periodEnd time.Time) ([]*aggregate.Payment, error) {
	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var payments []*aggregate.Payment

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		payments, txErr = s.paymentRepo.ListByPeriod(ctx, tx, repository.PaymentFilter{
			PeriodStart: &periodStart,
			PeriodEnd:   &periodEnd,
		})
		return txErr
	})

	if err != nil {
		return nil, err
	}
	return payments, nil
}

// GeneratePayments uses InSystemTx because it upserts into auth.payments
// (only the internal role has INSERT/UPDATE grants).
func (s *PayrollService) GeneratePayments(ctx context.Context, periodStart, periodEnd time.Time) ([]*aggregate.Payment, error) {
	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	if !periodEnd.After(periodStart) {
		return nil, payrollErrors.ErrInvalidPeriod
	}

	var payments []*aggregate.Payment

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		// Get accepted students
		students, txErr := s.studentRepo.ListByStatus(ctx, tx, "accepted")
		if txErr != nil {
			return txErr
		}

		if len(students) == 0 {
			return nil
		}

		// Batch calculate hours for all students in one query
		studentIDs := make([]int32, len(students))
		for i, st := range students {
			studentIDs[i] = st.StudentID
		}

		hoursMap, txErr := s.paymentRepo.CalculateHoursBatch(ctx, tx, studentIDs, periodStart, periodEnd)
		if txErr != nil {
			return txErr
		}

		for _, student := range students {
			hours := hoursMap[student.StudentID] // defaults to 0 if not in map
			grossAmount := hours * HourlyRate

			payment, txErr := aggregate.NewPayment(student.StudentID, periodStart, periodEnd, hours, grossAmount)
			if txErr != nil {
				return txErr
			}

			upserted, txErr := s.paymentRepo.Upsert(ctx, tx, payment)
			if txErr != nil {
				return txErr
			}
			payments = append(payments, upserted)
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return payments, nil
}

// ProcessPayment uses InSystemTx because UPDATE on auth.payments
// is only granted to the internal role.
func (s *PayrollService) ProcessPayment(ctx context.Context, paymentID uuid.UUID) (*aggregate.Payment, error) {
	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var result *aggregate.Payment

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		payment, txErr := s.paymentRepo.GetByID(ctx, tx, paymentID)
		if txErr != nil {
			return txErr
		}

		if txErr := payment.MarkProcessed(); txErr != nil {
			return txErr
		}

		updated, txErr := s.paymentRepo.Update(ctx, tx, payment)
		if txErr != nil {
			return txErr
		}
		result = updated
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// RevertPayment uses InSystemTx because UPDATE on auth.payments
// is only granted to the internal role.
func (s *PayrollService) RevertPayment(ctx context.Context, paymentID uuid.UUID) (*aggregate.Payment, error) {
	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var result *aggregate.Payment

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		payment, txErr := s.paymentRepo.GetByID(ctx, tx, paymentID)
		if txErr != nil {
			return txErr
		}

		if txErr := payment.RevertProcessed(); txErr != nil {
			return txErr
		}

		updated, txErr := s.paymentRepo.Update(ctx, tx, payment)
		if txErr != nil {
			return txErr
		}
		result = updated
		return nil
	})

	if err != nil {
		return nil, err
	}
	return result, nil
}

// BulkProcessPayments uses InSystemTx because UPDATE on auth.payments
// is only granted to the internal role.
func (s *PayrollService) BulkProcessPayments(ctx context.Context, paymentIDs []uuid.UUID) ([]*aggregate.Payment, error) {
	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var results []*aggregate.Payment

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		for _, id := range paymentIDs {
			payment, txErr := s.paymentRepo.GetByID(ctx, tx, id)
			if txErr != nil {
				return txErr
			}

			if txErr := payment.MarkProcessed(); txErr != nil {
				if errors.Is(txErr, payrollErrors.ErrAlreadyProcessed) {
					results = append(results, payment)
					continue
				}
				return txErr
			}

			updated, txErr := s.paymentRepo.Update(ctx, tx, payment)
			if txErr != nil {
				return txErr
			}
			results = append(results, updated)
		}
		return nil
	})

	if err != nil {
		return nil, err
	}
	return results, nil
}

// ExportPayments fetches payments for a period and enriches each with student
// profile and decrypted banking details. Uses InSystemTx to read across
// auth.payments, auth.students, and auth.banking_details.
// Batch-fetches students and banking details to avoid N+1 queries.
func (s *PayrollService) ExportPayments(ctx context.Context, periodStart, periodEnd time.Time) ([]*ExportRow, error) {
	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var rows []*ExportRow

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		payments, txErr := s.paymentRepo.ListByPeriod(ctx, tx, repository.PaymentFilter{
			PeriodStart: &periodStart,
			PeriodEnd:   &periodEnd,
		})
		if txErr != nil {
			return txErr
		}

		if len(payments) == 0 {
			return nil
		}

		// Collect unique student IDs
		studentIDs := make([]int32, 0, len(payments))
		seen := make(map[int32]bool, len(payments))
		for _, p := range payments {
			if !seen[p.StudentID] {
				seen[p.StudentID] = true
				studentIDs = append(studentIDs, p.StudentID)
			}
		}

		// Batch fetch students
		students, txErr := s.studentRepo.ListByIDs(ctx, tx, studentIDs)
		if txErr != nil {
			s.logger.Warn("failed to batch-fetch students for export", zap.Error(txErr))
		}
		studentMap := make(map[int32]*studentAggregate.Student, len(students))
		for _, st := range students {
			studentMap[st.StudentID] = st
		}

		// Batch fetch banking details (with decryption)
		bankingList, txErr := s.bankingDetailsRepo.ListByStudentIDs(ctx, tx, studentIDs)
		if txErr != nil {
			s.logger.Warn("failed to batch-fetch banking details for export", zap.Error(txErr))
		}
		bankingMap := make(map[int32]*studentAggregate.BankingDetails, len(bankingList))
		for _, bd := range bankingList {
			bankingMap[bd.StudentID] = bd
		}

		// Assemble rows
		rows = make([]*ExportRow, len(payments))
		for i, payment := range payments {
			rows[i] = &ExportRow{
				Payment:        payment,
				Student:        studentMap[payment.StudentID],
				BankingDetails: bankingMap[payment.StudentID],
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}
	return rows, nil
}

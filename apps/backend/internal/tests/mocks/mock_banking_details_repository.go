package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/repository"
)

var _ repository.BankingDetailsRepositoryInterface = (*MockBankingDetailsRepository)(nil)

type MockBankingDetailsRepository struct {
	UpsertFn         func(ctx context.Context, tx *sql.Tx, bankingDetails *aggregate.BankingDetails) (*aggregate.BankingDetails, error)
	GetByStudentIDFn func(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.BankingDetails, error)
	DeleteFn         func(ctx context.Context, tx *sql.Tx, studentID int32) error
}

func (m *MockBankingDetailsRepository) Upsert(ctx context.Context, tx *sql.Tx, bankingDetails *aggregate.BankingDetails) (*aggregate.BankingDetails, error) {
	if m.UpsertFn != nil {
		return m.UpsertFn(ctx, tx, bankingDetails)
	}
	return nil, nil
}

func (m *MockBankingDetailsRepository) GetByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.BankingDetails, error) {
	if m.GetByStudentIDFn != nil {
		return m.GetByStudentIDFn(ctx, tx, studentID)
	}
	return nil, nil
}

func (m *MockBankingDetailsRepository) Delete(ctx context.Context, tx *sql.Tx, studentID int32) error {
	if m.DeleteFn != nil {
		return m.DeleteFn(ctx, tx, studentID)
	}
	return nil
}

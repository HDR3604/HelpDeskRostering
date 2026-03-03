package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
)

var _ service.BankingDetailsServiceInterface = (*MockBankingDetailsService)(nil)

type MockBankingDetailsService struct {
	GetMyBankingDetailsFn             func(ctx context.Context) (*aggregate.BankingDetails, error)
	UpsertMyBankingDetailsFn          func(ctx context.Context, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error)
	GetBankingDetailsByStudentIDFn    func(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error)
	UpsertBankingDetailsByStudentIDFn func(ctx context.Context, studentID int32, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error)
}

func (m *MockBankingDetailsService) GetMyBankingDetails(ctx context.Context) (*aggregate.BankingDetails, error) {
	if m.GetMyBankingDetailsFn != nil {
		return m.GetMyBankingDetailsFn(ctx)
	}
	return nil, nil
}

func (m *MockBankingDetailsService) UpsertMyBankingDetails(ctx context.Context, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
	if m.UpsertMyBankingDetailsFn != nil {
		return m.UpsertMyBankingDetailsFn(ctx, input)
	}
	return nil, nil
}

func (m *MockBankingDetailsService) GetBankingDetailsByStudentID(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error) {
	if m.GetBankingDetailsByStudentIDFn != nil {
		return m.GetBankingDetailsByStudentIDFn(ctx, studentID)
	}
	return nil, nil
}

func (m *MockBankingDetailsService) UpsertBankingDetailsByStudentID(ctx context.Context, studentID int32, input service.UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
	if m.UpsertBankingDetailsByStudentIDFn != nil {
		return m.UpsertBankingDetailsByStudentIDFn(ctx, studentID, input)
	}
	return nil, nil
}

package mocks

import (
	"context"
	"database/sql"
	"net"

	"github.com/HDR3604/HelpDeskApp/internal/domain/consent"
)

var _ consent.RepositoryInterface = (*MockConsentRepository)(nil)

type MockConsentRepository struct {
	CreateFn         func(ctx context.Context, tx *sql.Tx, studentID int32, consentVersion string, ipAddress net.IP) (*consent.BankingConsent, error)
	GetByStudentIDFn func(ctx context.Context, tx *sql.Tx, studentID int32) (*consent.BankingConsent, error)
}

func (m *MockConsentRepository) Create(ctx context.Context, tx *sql.Tx, studentID int32, consentVersion string, ipAddress net.IP) (*consent.BankingConsent, error) {
	if m.CreateFn != nil {
		return m.CreateFn(ctx, tx, studentID, consentVersion, ipAddress)
	}
	return &consent.BankingConsent{}, nil
}

func (m *MockConsentRepository) GetByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*consent.BankingConsent, error) {
	if m.GetByStudentIDFn != nil {
		return m.GetByStudentIDFn(ctx, tx, studentID)
	}
	return nil, nil
}

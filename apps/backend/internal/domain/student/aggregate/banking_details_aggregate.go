package aggregate

import (
	"regexp"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
)

type BankAccountType string

const (
	BankAccountType_Chequeing BankAccountType = "chequeing"
	BankAccountType_Savings   BankAccountType = "savings"
)

type BankingDetails struct {
	StudentID     int32
	BankName      string
	BranchName    string
	AccountType   BankAccountType
	AccountNumber string
	CreatedAt     time.Time
	UpdatedAt     *time.Time
}

func NewBankingDetails(
	studentID int32,
	bankName string,
	branchName string,
	accountType string,
	accountNumber string,
) (*BankingDetails, error) {

	if strings.TrimSpace(bankName) == "" {
		return nil, errors.ErrInvalidBankName
	}

	if strings.TrimSpace(branchName) == "" {
		return nil, errors.ErrInvalidBranchName
	}

	at := BankAccountType(accountType)
	if at != BankAccountType_Chequeing && at != BankAccountType_Savings {
		return nil, errors.ErrInvalidAccountType
	}

	if !regexp.MustCompile(`^\d{7,16}$`).MatchString(accountNumber) {
		return nil, errors.ErrInvalidAccountNumber
	}

	return &BankingDetails{
		StudentID:     studentID,
		BankName:      strings.TrimSpace(bankName),
		BranchName:    strings.TrimSpace(branchName),
		AccountType:   at,
		AccountNumber: accountNumber,
	}, nil
}

func BankingDetailsFromModel(m *model.BankingDetails, decryptedAccountNumber string) *BankingDetails {
	return &BankingDetails{
		StudentID:     m.StudentID,
		BankName:      m.BankName,
		BranchName:    m.BranchName,
		AccountType:   BankAccountType(m.AccountType),
		AccountNumber: decryptedAccountNumber,
		CreatedAt:     m.CreatedAt,
		UpdatedAt:     m.UpdatedAt,
	}
}

func (bd *BankingDetails) ToModel(encryptedAccountNumber string) *model.BankingDetails {
	encryptedBytes := []byte(encryptedAccountNumber)

	return &model.BankingDetails{
		StudentID:     bd.StudentID,
		BankName:      bd.BankName,
		BranchName:    bd.BranchName,
		AccountType:   model.BankAccountType(bd.AccountType),
		AccountNumber: encryptedBytes,
	}
}

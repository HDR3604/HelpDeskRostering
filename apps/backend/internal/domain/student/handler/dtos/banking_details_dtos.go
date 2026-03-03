package dtos

import (
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
)

type UpsertBankingDetailsRequest struct {
	BankName      string `json:"bank_name"`
	BranchName    string `json:"branch_name"`
	AccountType   string `json:"account_type"`
	AccountNumber string `json:"account_number"`
}

type BankingDetailsResponse struct {
	StudentID     int32      `json:"student_id"`
	BankName      string     `json:"bank_name"`
	BranchName    string     `json:"branch_name"`
	AccountType   string     `json:"account_type"`
	AccountNumber string     `json:"account_number"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     *time.Time `json:"updated_at,omitempty"`
}

func maskAccountNumber(accountNumber string) string {
	if len(accountNumber) <= 4 {
		return "****"
	}
	return "****" + accountNumber[len(accountNumber)-4:]
}

func BankingDetailsToResponse(bd *aggregate.BankingDetails) BankingDetailsResponse {
	return BankingDetailsResponse{
		StudentID:     bd.StudentID,
		BankName:      bd.BankName,
		BranchName:    bd.BranchName,
		AccountType:   string(bd.AccountType),
		AccountNumber: maskAccountNumber(bd.AccountNumber),
		CreatedAt:     bd.CreatedAt,
		UpdatedAt:     bd.UpdatedAt,
	}
}

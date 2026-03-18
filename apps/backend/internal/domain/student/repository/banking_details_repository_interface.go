package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
)

type BankingDetailsRepositoryInterface interface {
	Upsert(ctx context.Context, tx *sql.Tx, bankingDetails *aggregate.BankingDetails) (*aggregate.BankingDetails, error)

	GetByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.BankingDetails, error)
	ListByStudentIDs(ctx context.Context, tx *sql.Tx, studentIDs []int32) ([]*aggregate.BankingDetails, error)
}

package student

import (
	"context"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/crypto"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"go.uber.org/zap"
)

var _ repository.BankingDetailsRepositoryInterface = (*BankingDetailsRepository)(nil)

type BankingDetailsRepository struct {
	logger        *zap.Logger
	encryptionKey []byte
}

func NewBankingDetailsRepository(logger *zap.Logger, encryptionKey string) repository.BankingDetailsRepositoryInterface {
	keyBytes, err := hex.DecodeString(encryptionKey)
	if err != nil {
		logger.Fatal("ENCRYPTION_KEY is not valid hex", zap.Error(err))
	}
	if len(keyBytes) != 32 {
		logger.Fatal("ENCRYPTION_KEY must decode to exactly 32 bytes", zap.Int("got", len(keyBytes)))
	}

	return &BankingDetailsRepository{
		logger:        logger,
		encryptionKey: keyBytes,
	}
}

func (r *BankingDetailsRepository) Upsert(
	ctx context.Context,
	tx *sql.Tx,
	bankingDetails *aggregate.BankingDetails,
) (*aggregate.BankingDetails, error) {
	encryptedAccountNumber, err := crypto.Encrypt(bankingDetails.AccountNumber, r.encryptionKey)
	if err != nil {
		r.logger.Error("failed to encrypt account number", zap.Error(err))
		return nil, fmt.Errorf("failed to encrypt account number: %w", err)
	}

	query := `
		INSERT INTO auth.banking_details (student_id, bank_name, branch_name, account_type, account_number, created_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (student_id) DO UPDATE
		SET bank_name = $2, branch_name = $3, account_type = $4, account_number = $5, updated_at = NOW()
		RETURNING student_id, bank_name, branch_name, account_type, account_number, created_at, updated_at
	`

	row := tx.QueryRowContext(
		ctx,
		query,
		bankingDetails.StudentID,
		bankingDetails.BankName,
		bankingDetails.BranchName,
		string(bankingDetails.AccountType),
		[]byte(encryptedAccountNumber),
	)

	var result model.BankingDetails
	err = row.Scan(
		&result.StudentID,
		&result.BankName,
		&result.BranchName,
		&result.AccountType,
		&result.AccountNumber,
		&result.CreatedAt,
		&result.UpdatedAt,
	)
	if err != nil {
		r.logger.Error("failed to upsert banking details", zap.Error(err))
		return nil, fmt.Errorf("failed to upsert banking details: %w", err)
	}

	encryptedAccountStr := string(result.AccountNumber)
	decryptedAccountNumber, err := crypto.Decrypt(encryptedAccountStr, r.encryptionKey)
	if err != nil {
		r.logger.Error("failed to decrypt account number", zap.Error(err))
		return nil, fmt.Errorf("failed to decrypt account number: %w", err)
	}

	return aggregate.BankingDetailsFromModel(&result, decryptedAccountNumber), nil
}

func (r *BankingDetailsRepository) GetByStudentID(
	ctx context.Context,
	tx *sql.Tx,
	studentID int32,
) (*aggregate.BankingDetails, error) {
	stmt := table.BankingDetails.
		SELECT(table.BankingDetails.AllColumns).
		WHERE(table.BankingDetails.StudentID.EQ(postgres.Int32(studentID)))

	var result model.BankingDetails
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, studentErrors.ErrBankingDetailsNotFound
		}
		r.logger.Error("failed to get banking details by student ID", zap.Error(err), zap.Int32("student_id", studentID))
		return nil, fmt.Errorf("failed to get banking details by student ID: %w", err)
	}

	encryptedAccountStr := string(result.AccountNumber)
	decryptedAccountNumber, err := crypto.Decrypt(encryptedAccountStr, r.encryptionKey)
	if err != nil {
		r.logger.Error("failed to decrypt account number", zap.Error(err))
		return nil, fmt.Errorf("failed to decrypt account number: %w", err)
	}

	return aggregate.BankingDetailsFromModel(&result, decryptedAccountNumber), nil
}

func (r *BankingDetailsRepository) Delete(
	ctx context.Context,
	tx *sql.Tx,
	studentID int32,
) error {
	stmt := table.BankingDetails.
		DELETE().
		WHERE(table.BankingDetails.StudentID.EQ(postgres.Int32(studentID)))

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to delete banking details", zap.Error(err), zap.Int32("student_id", studentID))
		return fmt.Errorf("failed to delete banking details: %w", err)
	}

	return nil
}

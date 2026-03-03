package service

import (
	"context"
	"database/sql"
	"fmt"
	"strconv"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/repository"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"go.uber.org/zap"
)

type UpsertBankingDetailsInput struct {
	BankName      string
	BranchName    string
	AccountType   string
	AccountNumber string
}

type BankingDetailsServiceInterface interface {
	GetMyBankingDetails(ctx context.Context) (*aggregate.BankingDetails, error)
	UpsertMyBankingDetails(ctx context.Context, input UpsertBankingDetailsInput) (*aggregate.BankingDetails, error)
	GetBankingDetailsByStudentID(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error)
	UpsertBankingDetailsByStudentID(ctx context.Context, studentID int32, input UpsertBankingDetailsInput) (*aggregate.BankingDetails, error)
}

type BankingDetailsService struct {
	logger    *zap.Logger
	txManager database.TxManagerInterface
	repo      repository.BankingDetailsRepositoryInterface
}

func NewBankingDetailsService(
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	repo repository.BankingDetailsRepositoryInterface,
) BankingDetailsServiceInterface {
	return &BankingDetailsService{
		logger:    logger,
		txManager: txManager,
		repo:      repo,
	}
}

func (s *BankingDetailsService) getAuthContext(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, studentErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

func (s *BankingDetailsService) getMyStudentID(ctx context.Context) (int32, database.AuthContext, error) {
	authCtx, err := s.getAuthContext(ctx)
	if err != nil {
		return 0, authCtx, err
	}

	if authCtx.StudentID == nil {
		s.logger.Error("student ID is nil in auth context")
		return 0, authCtx, studentErrors.ErrNotAuthorized
	}

	id, err := strconv.ParseInt(*authCtx.StudentID, 10, 32)
	if err != nil {
		s.logger.Error("invalid student ID in auth context", zap.String("student_id", *authCtx.StudentID), zap.Error(err))
		return 0, authCtx, fmt.Errorf("%w: %w", studentErrors.ErrInvalidAuthContext, err)
	}

	return int32(id), authCtx, nil
}

func (s *BankingDetailsService) GetMyBankingDetails(ctx context.Context) (*aggregate.BankingDetails, error) {
	studentID, authCtx, err := s.getMyStudentID(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.BankingDetails
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByStudentID(ctx, tx, studentID)
		return txErr
	})

	return result, err
}

func (s *BankingDetailsService) UpsertMyBankingDetails(ctx context.Context, input UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
	studentID, authCtx, err := s.getMyStudentID(ctx)
	if err != nil {
		return nil, err
	}

	// Validate input
	bankingDetails, err := aggregate.NewBankingDetails(
		studentID,
		input.BankName,
		input.BranchName,
		input.AccountType,
		input.AccountNumber,
	)
	if err != nil {
		return nil, err
	}

	var result *aggregate.BankingDetails
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Upsert(ctx, tx, bankingDetails)
		return txErr
	})

	return result, err
}

func (s *BankingDetailsService) GetBankingDetailsByStudentID(ctx context.Context, studentID int32) (*aggregate.BankingDetails, error) {
	authCtx, err := s.getAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	// Check if user is admin
	if authCtx.Role != string(userAggregate.Role_Admin) {
		s.logger.Error("non-admin user attempted to access student banking details", zap.String("user_id", authCtx.UserID), zap.String("role", authCtx.Role))
		return nil, studentErrors.ErrNotAuthorized
	}

	var result *aggregate.BankingDetails
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.GetByStudentID(ctx, tx, studentID)
		return txErr
	})

	return result, err
}

func (s *BankingDetailsService) UpsertBankingDetailsByStudentID(ctx context.Context, studentID int32, input UpsertBankingDetailsInput) (*aggregate.BankingDetails, error) {
	authCtx, err := s.getAuthContext(ctx)
	if err != nil {
		return nil, err
	}

	// Check if user is admin
	if authCtx.Role != string(userAggregate.Role_Admin) {
		s.logger.Error("non-admin user attempted to upsert student banking details", zap.String("user_id", authCtx.UserID), zap.String("role", authCtx.Role))
		return nil, studentErrors.ErrNotAuthorized
	}

	// Validate input
	bankingDetails, err := aggregate.NewBankingDetails(
		studentID,
		input.BankName,
		input.BranchName,
		input.AccountType,
		input.AccountNumber,
	)
	if err != nil {
		return nil, err
	}

	var result *aggregate.BankingDetails
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repo.Upsert(ctx, tx, bankingDetails)
		return txErr
	})

	return result, err
}

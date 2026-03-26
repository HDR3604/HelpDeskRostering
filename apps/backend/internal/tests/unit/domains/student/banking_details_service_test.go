package student_test

import (
	"context"
	"database/sql"
	stderrors "errors"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"go.uber.org/zap"
)

func strPtr(s string) *string { return &s }

func TestGetMyBankingDetails_Success(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	studentID := "123"
	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: &studentID,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			if sid != 123 {
				t.Errorf("Expected student ID 123, got %d", sid)
			}
			now := time.Now().UTC()
			return &aggregate.BankingDetails{
				StudentID:     123,
				BankName:      "Bank A",
				BranchName:    "Branch 1",
				AccountType:   aggregate.BankAccountType_Savings,
				AccountNumber: "12345678",
				CreatedAt:     now,
				UpdatedAt:     &now,
			}, nil
		},
	}

	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	result, err := svc.GetMyBankingDetails(ctx)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if result.BankName != "Bank A" {
		t.Errorf("Expected bank name 'Bank A', got %q", result.BankName)
	}
}

func TestGetMyBankingDetails_MissingAuthContext(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	ctx := context.Background()

	mockRepo := &mocks.MockBankingDetailsRepository{}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	_, err := svc.GetMyBankingDetails(ctx)

	if err != errors.ErrMissingAuthContext {
		t.Errorf("Expected ErrMissingAuthContext, got %v", err)
	}
}

func TestGetMyBankingDetails_NilStudentID(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: nil,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	_, err := svc.GetMyBankingDetails(ctx)

	if err != errors.ErrNotAuthorized {
		t.Errorf("Expected ErrNotAuthorized, got %v", err)
	}
}

func TestUpsertMyBankingDetails_Success(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	studentID := "123"
	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: &studentID,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			return nil, errors.ErrBankingDetailsNotFound
		},
		UpsertFn: func(ctx context.Context, tx *sql.Tx, bd *aggregate.BankingDetails) (*aggregate.BankingDetails, error) {
			if bd.StudentID != 123 {
				t.Errorf("Expected student ID 123, got %d", bd.StudentID)
			}
			if bd.BankName != "Bank A" {
				t.Errorf("Expected bank name 'Bank A', got %q", bd.BankName)
			}
			return bd, nil
		},
	}

	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	input := service.UpsertBankingDetailsInput{
		BankName:      strPtr("Bank A"),
		BranchName:    strPtr("Branch 1"),
		AccountType:   strPtr("savings"),
		AccountNumber: strPtr("12345678"),
	}
	result, err := svc.UpsertMyBankingDetails(ctx, input)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if result.BankName != "Bank A" {
		t.Errorf("Expected bank name 'Bank A', got %q", result.BankName)
	}
}

func TestUpsertMyBankingDetails_InvalidBankName(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	studentID := "123"
	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: &studentID,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			return nil, errors.ErrBankingDetailsNotFound
		},
	}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	input := service.UpsertBankingDetailsInput{
		BankName:      strPtr(""),
		BranchName:    strPtr("Branch 1"),
		AccountType:   strPtr("savings"),
		AccountNumber: strPtr("12345678"),
	}
	_, err := svc.UpsertMyBankingDetails(ctx, input)

	if err != errors.ErrInvalidBankName {
		t.Errorf("Expected ErrInvalidBankName, got %v", err)
	}
}

func TestUpsertMyBankingDetails_InvalidAccountNumber(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	studentID := "123"
	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: &studentID,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			return nil, errors.ErrBankingDetailsNotFound
		},
	}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	input := service.UpsertBankingDetailsInput{
		BankName:      strPtr("Bank A"),
		BranchName:    strPtr("Branch 1"),
		AccountType:   strPtr("savings"),
		AccountNumber: strPtr("123"), // too short
	}
	_, err := svc.UpsertMyBankingDetails(ctx, input)

	if err != errors.ErrInvalidAccountNumber {
		t.Errorf("Expected ErrInvalidAccountNumber, got %v", err)
	}
}

func TestGetBankingDetailsByStudentID_Success(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: nil,
		Role:      "admin",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			if sid != 456 {
				t.Errorf("Expected student ID 456, got %d", sid)
			}
			now := time.Now().UTC()
			return &aggregate.BankingDetails{
				StudentID:     456,
				BankName:      "Bank B",
				BranchName:    "Branch 2",
				AccountType:   aggregate.BankAccountType_Chequeing,
				AccountNumber: "87654321",
				CreatedAt:     now,
				UpdatedAt:     &now,
			}, nil
		},
	}

	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	result, err := svc.GetBankingDetailsByStudentID(ctx, 456)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if result.BankName != "Bank B" {
		t.Errorf("Expected bank name 'Bank B', got %q", result.BankName)
	}
}

func TestGetBankingDetailsByStudentID_NotAdmin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: nil,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	_, err := svc.GetBankingDetailsByStudentID(ctx, 456)

	if err != errors.ErrNotAuthorized {
		t.Errorf("Expected ErrNotAuthorized, got %v", err)
	}
}

func TestGetMyBankingDetails_InvalidStudentID(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	invalidID := "not-a-number"
	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: &invalidID,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	_, err := svc.GetMyBankingDetails(ctx)

	if err == nil {
		t.Fatal("Expected error, got nil")
	}
	if !stderrors.Is(err, errors.ErrInvalidAuthContext) {
		t.Errorf("Expected ErrInvalidAuthContext, got %v", err)
	}
}

func TestGetBankingDetailsByStudentID_NotFound(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: nil,
		Role:      "admin",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			return nil, errors.ErrBankingDetailsNotFound
		},
	}

	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	_, err := svc.GetBankingDetailsByStudentID(ctx, 999)

	if err != errors.ErrBankingDetailsNotFound {
		t.Errorf("Expected ErrBankingDetailsNotFound, got %v", err)
	}
}

func TestUpsertBankingDetailsByStudentID_Success(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	authCtx := database.AuthContext{
		UserID:    "admin-user",
		StudentID: nil,
		Role:      "admin",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{
		GetByStudentIDFn: func(ctx context.Context, tx *sql.Tx, sid int32) (*aggregate.BankingDetails, error) {
			return nil, errors.ErrBankingDetailsNotFound
		},
		UpsertFn: func(ctx context.Context, tx *sql.Tx, bd *aggregate.BankingDetails) (*aggregate.BankingDetails, error) {
			if bd.StudentID != 456 {
				t.Errorf("Expected student ID 456, got %d", bd.StudentID)
			}
			if bd.BankName != "Admin Bank" {
				t.Errorf("Expected bank name 'Admin Bank', got %q", bd.BankName)
			}
			return bd, nil
		},
	}

	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	input := service.UpsertBankingDetailsInput{
		BankName:      strPtr("Admin Bank"),
		BranchName:    strPtr("Admin Branch"),
		AccountType:   strPtr("chequeing"),
		AccountNumber: strPtr("9876543210"),
	}
	result, err := svc.UpsertBankingDetailsByStudentID(ctx, 456, input)

	if err != nil {
		t.Fatalf("Expected no error, got %v", err)
	}
	if result.BankName != "Admin Bank" {
		t.Errorf("Expected bank name 'Admin Bank', got %q", result.BankName)
	}
}

func TestUpsertBankingDetailsByStudentID_NotAdmin(t *testing.T) {
	logger, _ := zap.NewDevelopment()
	defer logger.Sync()

	authCtx := database.AuthContext{
		UserID:    "user-123",
		StudentID: nil,
		Role:      "student",
	}
	ctx := database.WithAuthContext(context.Background(), authCtx)

	mockRepo := &mocks.MockBankingDetailsRepository{}
	mockTxManager := &mocks.StubTxManager{}

	svc := service.NewBankingDetailsService(logger, mockTxManager, mockRepo, &mocks.MockConsentRepository{})
	input := service.UpsertBankingDetailsInput{
		BankName:      strPtr("Bank A"),
		BranchName:    strPtr("Branch 1"),
		AccountType:   strPtr("savings"),
		AccountNumber: strPtr("12345678"),
	}
	_, err := svc.UpsertBankingDetailsByStudentID(ctx, 456, input)

	if err != errors.ErrNotAuthorized {
		t.Errorf("Expected ErrNotAuthorized, got %v", err)
	}
}

package service_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	authAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

// buildAuthService wires the auth service with mocks that return successfully.
// Individual benchmarks override the specific mock Fn they need.
func buildAuthService() (service.AuthServiceInterface, *mocks.MockUserRepository, *mocks.MockRefreshTokenRepository, *mocks.MockAuthTokenRepository) {
	logger := zap.NewNop()
	txMgr := &mocks.StubTxManager{}

	userRepo := &mocks.MockUserRepository{}
	refreshRepo := &mocks.MockRefreshTokenRepository{}
	authTokenRepo := &mocks.MockAuthTokenRepository{}
	emailSender := &mocks.MockEmailSender{
		SendFn: func(_ context.Context, _ emailDtos.SendEmailRequest) (*emailDtos.SendEmailResponse, error) {
			return &emailDtos.SendEmailResponse{ID: "mock"}, nil
		},
	}

	svc := service.NewAuthService(
		logger, txMgr, userRepo, refreshRepo, authTokenRepo, emailSender,
		[]byte("benchmark-secret-at-least-32-bytes!!"),
		3600,   // accessTokenTTL
		86400,  // refreshTokenTTL
		86400,  // verificationTokenTTL
		604800, // onboardingTokenTTL
		"http://localhost:3000",
		"noreply@test.com",
	)
	return svc, userRepo, refreshRepo, authTokenRepo
}

// ---------------------------------------------------------------------------
// BenchmarkAuthService_Register — exercises bcrypt hashing (CPU-intensive)
// ---------------------------------------------------------------------------

func BenchmarkAuthService_Register(b *testing.B) {
	svc, userRepo, _, authTokenRepo := buildAuthService()

	userRepo.CreateFn = func(_ context.Context, _ *sql.Tx, u *userAggregate.User) (*userAggregate.User, error) {
		u.CreatedAt = ptrTime(time.Now())
		return u, nil
	}
	userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return nil, nil // no existing user
	}
	authTokenRepo.CreateFn = func(_ context.Context, _ *sql.Tx, t *authAggregate.AuthToken) (*authAggregate.AuthToken, error) {
		return t, nil
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		email := "bench-" + uuid.New().String()[:8] + "@uwi.edu"
		_, err := svc.Register(context.Background(), "Bench", "User", email, "BenchPass1!", "admin")
		if err != nil {
			b.Fatalf("Register: %v", err)
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkAuthService_Login — exercises bcrypt verification + JWT signing
// ---------------------------------------------------------------------------

func BenchmarkAuthService_Login(b *testing.B) {
	svc, userRepo, refreshRepo, _ := buildAuthService()

	hashed, _ := bcrypt.GenerateFromPassword([]byte("BenchPass1!"), bcrypt.DefaultCost)
	now := time.Now()
	benchUser := &userAggregate.User{
		ID:              uuid.New(),
		FirstName:       "Bench",
		LastName:        "User",
		Email:           "bench@uwi.edu",
		Password:        string(hashed),
		Role:            userAggregate.Role_Admin,
		IsActive:        true,
		EmailVerifiedAt: &now,
	}

	userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return benchUser, nil
	}
	userRepo.GetStudentIDByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*string, error) {
		return nil, nil
	}
	refreshRepo.CreateFn = func(_ context.Context, _ *sql.Tx, t *authAggregate.RefreshToken) (*authAggregate.RefreshToken, error) {
		return t, nil
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _, err := svc.Login(context.Background(), "bench@uwi.edu", "BenchPass1!")
		if err != nil {
			b.Fatalf("Login: %v", err)
		}
	}
}

// ---------------------------------------------------------------------------
// BenchmarkAuthService_ValidateAccessToken — JWT parsing only
// ---------------------------------------------------------------------------

func BenchmarkAuthService_ValidateAccessToken(b *testing.B) {
	svc, userRepo, refreshRepo, _ := buildAuthService()

	// Generate a valid token by doing a login first
	hashed, _ := bcrypt.GenerateFromPassword([]byte("BenchPass1!"), bcrypt.MinCost) // MinCost for setup speed
	now := time.Now()
	benchUser := &userAggregate.User{
		ID:              uuid.New(),
		FirstName:       "Bench",
		LastName:        "User",
		Email:           "bench@uwi.edu",
		Password:        string(hashed),
		Role:            userAggregate.Role_Admin,
		IsActive:        true,
		EmailVerifiedAt: &now,
	}

	userRepo.GetByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*userAggregate.User, error) {
		return benchUser, nil
	}
	userRepo.GetStudentIDByEmailFn = func(_ context.Context, _ *sql.Tx, _ string) (*string, error) {
		return nil, nil
	}
	refreshRepo.CreateFn = func(_ context.Context, _ *sql.Tx, t *authAggregate.RefreshToken) (*authAggregate.RefreshToken, error) {
		return t, nil
	}

	accessToken, _, err := svc.Login(context.Background(), "bench@uwi.edu", "BenchPass1!")
	if err != nil {
		b.Fatalf("Login setup: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, err := svc.ValidateAccessToken(accessToken)
		if err != nil {
			b.Fatalf("ValidateAccessToken: %v", err)
		}
	}
}

func ptrTime(t time.Time) *time.Time { return &t }

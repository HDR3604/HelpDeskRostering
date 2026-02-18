package mocks

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
)

type MockAuthService struct {
	LoginFn              func(ctx context.Context, email, password string) (string, string, error)
	RefreshFn            func(ctx context.Context, rawRefreshToken string) (string, string, error)
	LogoutFn             func(ctx context.Context, rawRefreshToken string) error
	RegisterFn           func(ctx context.Context, email, password, role string) (*userAggregate.User, error)
	ChangePasswordFn     func(ctx context.Context, userID, currentPassword, newPassword string) error
	VerifyEmailFn        func(ctx context.Context, rawToken string) error
	ResendVerificationFn func(ctx context.Context, email string) error
	ValidateAccessTokenFn func(tokenString string) (*service.Claims, error)
}

var _ service.AuthServiceInterface = (*MockAuthService)(nil)

func (m *MockAuthService) Login(ctx context.Context, email, password string) (string, string, error) {
	return m.LoginFn(ctx, email, password)
}

func (m *MockAuthService) Refresh(ctx context.Context, rawRefreshToken string) (string, string, error) {
	return m.RefreshFn(ctx, rawRefreshToken)
}

func (m *MockAuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	return m.LogoutFn(ctx, rawRefreshToken)
}

func (m *MockAuthService) Register(ctx context.Context, email, password, role string) (*userAggregate.User, error) {
	return m.RegisterFn(ctx, email, password, role)
}

func (m *MockAuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	return m.ChangePasswordFn(ctx, userID, currentPassword, newPassword)
}

func (m *MockAuthService) VerifyEmail(ctx context.Context, rawToken string) error {
	return m.VerifyEmailFn(ctx, rawToken)
}

func (m *MockAuthService) ResendVerification(ctx context.Context, email string) error {
	return m.ResendVerificationFn(ctx, email)
}

func (m *MockAuthService) ValidateAccessToken(tokenString string) (*service.Claims, error) {
	return m.ValidateAccessTokenFn(tokenString)
}

package service

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	authErrors "github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/repository"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	userRepository "github.com/HDR3604/HelpDeskApp/internal/domain/user/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	emailInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/templates"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
)

type Claims struct {
	jwt.RegisteredClaims
	Role      string  `json:"role"`
	StudentID *string `json:"student_id,omitempty"`
}

type AuthServiceInterface interface {
	Login(ctx context.Context, email, password string) (accessToken, refreshToken string, err error)
	Refresh(ctx context.Context, rawRefreshToken string) (accessToken, newRefreshToken string, err error)
	Logout(ctx context.Context, rawRefreshToken string) error
	Register(ctx context.Context, email, password, role string) (*userAggregate.User, error)
	ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error
	VerifyEmail(ctx context.Context, rawToken string) error
	ResendVerification(ctx context.Context, email string) error
	ValidateAccessToken(tokenString string) (*Claims, error)
}

type AuthService struct {
	logger                *zap.Logger
	txManager             database.TxManagerInterface
	userRepo              userRepository.UserRepositoryInterface
	refreshTokenRepo      repository.RefreshTokenRepositoryInterface
	emailVerificationRepo repository.EmailVerificationRepositoryInterface
	emailSender           emailInterfaces.EmailSenderInterface
	jwtSecret             []byte
	accessTokenTTL        int
	refreshTokenTTL       int
	verificationTokenTTL  int
	frontendURL           string
	fromEmail             string
}

var _ AuthServiceInterface = (*AuthService)(nil)

func NewAuthService(
	logger *zap.Logger,
	txManager database.TxManagerInterface,
	userRepo userRepository.UserRepositoryInterface,
	refreshTokenRepo repository.RefreshTokenRepositoryInterface,
	emailVerificationRepo repository.EmailVerificationRepositoryInterface,
	emailSender emailInterfaces.EmailSenderInterface,
	jwtSecret []byte,
	accessTokenTTL int,
	refreshTokenTTL int,
	verificationTokenTTL int,
	frontendURL string,
	fromEmail string,
) *AuthService {
	return &AuthService{
		logger:                logger,
		txManager:             txManager,
		userRepo:              userRepo,
		refreshTokenRepo:      refreshTokenRepo,
		emailVerificationRepo: emailVerificationRepo,
		emailSender:           emailSender,
		jwtSecret:             jwtSecret,
		accessTokenTTL:        accessTokenTTL,
		refreshTokenTTL:       refreshTokenTTL,
		verificationTokenTTL:  verificationTokenTTL,
		frontendURL:           frontendURL,
		fromEmail:             fromEmail,
	}
}

func (s *AuthService) Register(ctx context.Context, email, password, role string) (*userAggregate.User, error) {
	userRole := userAggregate.Role(role)

	// Validate via aggregate (plain password before hashing)
	_, err := userAggregate.NewUser(email, password, userRole)
	if err != nil {
		return nil, err
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), 14)
	if err != nil {
		s.logger.Error("failed to hash password", zap.Error(err))
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user, err := userAggregate.NewUser(email, string(hashedPassword), userRole)
	if err != nil {
		return nil, fmt.Errorf("failed to create user aggregate: %w", err)
	}

	var createdUser *userAggregate.User
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		// Check email uniqueness
		existing, err := s.userRepo.GetByEmail(ctx, tx, email)
		if err != nil && !errors.Is(err, userErrors.ErrNotFound) {
			return fmt.Errorf("failed to check existing email: %w", err)
		}
		if existing != nil {
			return userErrors.ErrEmailAlreadyExists
		}

		createdUser, err = s.userRepo.Create(ctx, tx, user)
		if err != nil {
			return fmt.Errorf("failed to create user: %w", err)
		}

		// Generate and store verification token
		verification, rawToken, err := aggregate.NewEmailVerification(createdUser.ID, s.verificationTokenTTL)
		if err != nil {
			return fmt.Errorf("failed to generate verification token: %w", err)
		}

		_, err = s.emailVerificationRepo.Create(ctx, tx, verification)
		if err != nil {
			return fmt.Errorf("failed to store verification token: %w", err)
		}

		// Send verification email
		verificationURL := fmt.Sprintf("%s/verify-email?token=%s", s.frontendURL, rawToken)
		_, err = s.emailSender.Send(ctx, dtos.SendEmailRequest{
			From:    s.fromEmail,
			To:      []string{email},
			Subject: "Verify Your Email - DCIT Help Desk",
			Template: &types.EmailTemplate{
				ID: templates.TemplateID_EmailVerification,
				Variables: map[string]any{
					"VERIFICATION_URL": verificationURL,
					"USER_EMAIL":       email,
				},
			},
		})
		if err != nil {
			s.logger.Error("failed to send verification email", zap.Error(err))
			return authErrors.ErrSendVerificationFailed
		}

		return nil
	})
	if err != nil {
		return nil, err
	}

	return createdUser, nil
}

func (s *AuthService) Login(ctx context.Context, email, password string) (string, string, error) {
	var accessToken, rawRefreshToken string

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		user, err := s.userRepo.GetByEmail(ctx, tx, email)
		if err != nil {
			if errors.Is(err, userErrors.ErrNotFound) {
				return authErrors.ErrInvalidCredentials
			}
			return fmt.Errorf("failed to get user: %w", err)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
			return authErrors.ErrInvalidCredentials
		}

		if !user.IsActive {
			return authErrors.ErrAccountInactive
		}

		if user.EmailVerifiedAt == nil {
			return authErrors.ErrEmailNotVerified
		}

		// Look up student_id if student role
		var studentID *string
		if user.Role == userAggregate.Role_Student {
			studentID, err = s.userRepo.GetStudentIDByEmail(ctx, tx, email)
			if err != nil {
				return fmt.Errorf("failed to get student ID: %w", err)
			}
		}

		accessToken, err = s.generateAccessToken(user.ID.String(), string(user.Role), studentID)
		if err != nil {
			return fmt.Errorf("failed to generate access token: %w", err)
		}

		refreshToken, rawToken, err := aggregate.NewRefreshToken(user.ID, s.refreshTokenTTL)
		if err != nil {
			return fmt.Errorf("failed to generate refresh token: %w", err)
		}

		_, err = s.refreshTokenRepo.Create(ctx, tx, refreshToken)
		if err != nil {
			return fmt.Errorf("failed to store refresh token: %w", err)
		}

		rawRefreshToken = rawToken
		return nil
	})
	if err != nil {
		return "", "", err
	}

	return accessToken, rawRefreshToken, nil
}

func (s *AuthService) Refresh(ctx context.Context, rawRefreshToken string) (string, string, error) {
	tokenHash, err := aggregate.HashToken(rawRefreshToken)
	if err != nil {
		return "", "", fmt.Errorf("failed to hash token: %w", err)
	}

	var newAccessToken, newRawRefreshToken string
	var tokenReuseDetected bool

	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		oldToken, err := s.refreshTokenRepo.GetByTokenHash(ctx, tx, tokenHash)
		if err != nil {
			if errors.Is(err, authErrors.ErrInvalidRefreshToken) {
				return authErrors.ErrInvalidRefreshToken
			}
			return fmt.Errorf("failed to look up refresh token: %w", err)
		}

		// Theft detection: if token is revoked, someone is reusing it.
		// Revoke all tokens for this user and return nil so the tx commits,
		// then signal the caller via the tokenReuseDetected flag.
		if oldToken.IsRevoked() {
			s.logger.Warn("refresh token reuse detected, revoking all tokens",
				zap.String("user_id", oldToken.UserID.String()))
			if err := s.refreshTokenRepo.RevokeAllByUserID(ctx, tx, oldToken.UserID); err != nil {
				return fmt.Errorf("failed to revoke all tokens: %w", err)
			}
			tokenReuseDetected = true
			return nil
		}

		if oldToken.IsExpired() {
			return authErrors.ErrRefreshTokenExpired
		}

		// Look up user for current role
		user, err := s.userRepo.GetByID(ctx, tx, oldToken.UserID.String())
		if err != nil {
			return fmt.Errorf("failed to get user: %w", err)
		}

		var studentID *string
		if user.Role == userAggregate.Role_Student {
			studentID, err = s.userRepo.GetStudentIDByEmail(ctx, tx, user.Email)
			if err != nil {
				return fmt.Errorf("failed to get student ID: %w", err)
			}
		}

		newAccessToken, err = s.generateAccessToken(user.ID.String(), string(user.Role), studentID)
		if err != nil {
			return fmt.Errorf("failed to generate access token: %w", err)
		}

		newToken, rawToken, err := aggregate.NewRefreshToken(user.ID, s.refreshTokenTTL)
		if err != nil {
			return fmt.Errorf("failed to generate refresh token: %w", err)
		}

		createdToken, err := s.refreshTokenRepo.Create(ctx, tx, newToken)
		if err != nil {
			return fmt.Errorf("failed to store new refresh token: %w", err)
		}

		// Revoke old token with reference to new one
		if err := s.refreshTokenRepo.RevokeByID(ctx, tx, oldToken.ID, &createdToken.ID); err != nil {
			return fmt.Errorf("failed to revoke old refresh token: %w", err)
		}

		newRawRefreshToken = rawToken
		return nil
	})
	if err != nil {
		return "", "", err
	}

	if tokenReuseDetected {
		return "", "", authErrors.ErrTokenReuse
	}

	return newAccessToken, newRawRefreshToken, nil
}

func (s *AuthService) Logout(ctx context.Context, rawRefreshToken string) error {
	tokenHash, err := aggregate.HashToken(rawRefreshToken)
	if err != nil {
		return fmt.Errorf("failed to hash token: %w", err)
	}

	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		token, err := s.refreshTokenRepo.GetByTokenHash(ctx, tx, tokenHash)
		if err != nil {
			if errors.Is(err, authErrors.ErrInvalidRefreshToken) {
				return nil // Idempotent: already gone
			}
			return fmt.Errorf("failed to look up refresh token: %w", err)
		}

		if token.IsRevoked() {
			return nil // Already revoked
		}

		return s.refreshTokenRepo.RevokeByID(ctx, tx, token.ID, nil)
	})
}

func (s *AuthService) ChangePassword(ctx context.Context, userID, currentPassword, newPassword string) error {
	if err := userAggregate.ValidatePassword(newPassword); err != nil {
		return err
	}

	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		user, err := s.userRepo.GetByID(ctx, tx, userID)
		if err != nil {
			return fmt.Errorf("failed to get user: %w", err)
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(currentPassword)); err != nil {
			return authErrors.ErrPasswordMismatch
		}

		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(newPassword)); err == nil {
			return authErrors.ErrPasswordSameAsOld
		}

		hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), 14)
		if err != nil {
			return fmt.Errorf("failed to hash password: %w", err)
		}

		user.Password = string(hashedPassword)
		if err := s.userRepo.Update(ctx, tx, user); err != nil {
			return fmt.Errorf("failed to update user: %w", err)
		}

		// Revoke all refresh tokens (invalidate all sessions)
		return s.refreshTokenRepo.RevokeAllByUserID(ctx, tx, user.ID)
	})
}

func (s *AuthService) VerifyEmail(ctx context.Context, rawToken string) error {
	tokenHash, err := aggregate.HashToken(rawToken)
	if err != nil {
		return fmt.Errorf("failed to hash token: %w", err)
	}

	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		verification, err := s.emailVerificationRepo.GetByTokenHash(ctx, tx, tokenHash)
		if err != nil {
			return err // ErrVerificationTokenInvalid from repo
		}

		if verification.IsUsed() {
			return authErrors.ErrVerificationTokenUsed
		}

		if verification.IsExpired() {
			return authErrors.ErrVerificationTokenExpired
		}

		user, err := s.userRepo.GetByID(ctx, tx, verification.UserID.String())
		if err != nil {
			return fmt.Errorf("failed to get user: %w", err)
		}

		if user.EmailVerifiedAt != nil {
			return authErrors.ErrEmailAlreadyVerified
		}

		now := time.Now()
		user.EmailVerifiedAt = &now
		if err := s.userRepo.Update(ctx, tx, user); err != nil {
			return fmt.Errorf("failed to update user: %w", err)
		}

		verification.MarkUsed()
		// Update the verification token's used_at via a direct update
		return s.emailVerificationRepo.InvalidateAllByUserID(ctx, tx, verification.UserID)
	})
}

func (s *AuthService) ResendVerification(ctx context.Context, email string) error {
	return s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		user, err := s.userRepo.GetByEmail(ctx, tx, email)
		if err != nil {
			if errors.Is(err, userErrors.ErrNotFound) {
				return userErrors.ErrNotFound
			}
			return fmt.Errorf("failed to get user: %w", err)
		}

		if user.EmailVerifiedAt != nil {
			return authErrors.ErrEmailAlreadyVerified
		}

		// Invalidate all existing verification tokens
		if err := s.emailVerificationRepo.InvalidateAllByUserID(ctx, tx, user.ID); err != nil {
			return fmt.Errorf("failed to invalidate old tokens: %w", err)
		}

		verification, rawToken, err := aggregate.NewEmailVerification(user.ID, s.verificationTokenTTL)
		if err != nil {
			return fmt.Errorf("failed to generate verification token: %w", err)
		}

		_, err = s.emailVerificationRepo.Create(ctx, tx, verification)
		if err != nil {
			return fmt.Errorf("failed to store verification token: %w", err)
		}

		verificationURL := fmt.Sprintf("%s/verify-email?token=%s", s.frontendURL, rawToken)
		_, err = s.emailSender.Send(ctx, dtos.SendEmailRequest{
			From:    s.fromEmail,
			To:      []string{email},
			Subject: "Verify Your Email - DCIT Help Desk",
			Template: &types.EmailTemplate{
				ID: templates.TemplateID_EmailVerification,
				Variables: map[string]any{
					"VERIFICATION_URL": verificationURL,
					"USER_EMAIL":       email,
				},
			},
		})
		if err != nil {
			s.logger.Error("failed to send verification email", zap.Error(err))
			return authErrors.ErrSendVerificationFailed
		}

		return nil
	})
}

func (s *AuthService) ValidateAccessToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return s.jwtSecret, nil
	})
	if err != nil {
		return nil, authErrors.ErrInvalidAccessToken
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, authErrors.ErrInvalidAccessToken
	}

	return claims, nil
}

func (s *AuthService) generateAccessToken(userID string, role string, studentID *string) (string, error) {
	now := time.Now()
	claims := Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Duration(s.accessTokenTTL) * time.Second)),
			Issuer:    "helpdesk-api",
		},
		Role:      role,
		StudentID: studentID,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(s.jwtSecret)
}

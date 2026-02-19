package errors

import "errors"

var (
	ErrInvalidCredentials  = errors.New("invalid email or password")
	ErrAccountInactive     = errors.New("account is not active")
	ErrInvalidRefreshToken = errors.New("invalid refresh token")
	ErrRefreshTokenExpired = errors.New("refresh token has expired")
	ErrRefreshTokenRevoked = errors.New("refresh token has been revoked")
	ErrTokenReuse          = errors.New("refresh token reuse detected, all sessions revoked")
	ErrMissingAuthContext  = errors.New("missing authentication context")
	ErrInvalidAccessToken  = errors.New("invalid or expired access token")
	ErrPasswordMismatch    = errors.New("current password is incorrect")
	ErrPasswordSameAsOld   = errors.New("new password must be different from current password")

	ErrEmailNotVerified         = errors.New("email address has not been verified")
	ErrVerificationTokenInvalid = errors.New("invalid verification token")
	ErrVerificationTokenExpired = errors.New("verification token has expired")
	ErrVerificationTokenUsed    = errors.New("verification token has already been used")
	ErrEmailAlreadyVerified     = errors.New("email is already verified")
	ErrSendVerificationFailed   = errors.New("failed to send verification email")

	ErrPasswordResetTokenInvalid = errors.New("invalid password reset token")
	ErrPasswordResetTokenExpired = errors.New("password reset token has expired")
	ErrPasswordResetTokenUsed    = errors.New("password reset token has already been used")
)

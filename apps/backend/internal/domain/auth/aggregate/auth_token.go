package aggregate

import (
	"crypto/rand"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/google/uuid"
)

type AuthTokenType = string

const (
	AuthTokenType_EmailVerification AuthTokenType = "email_verification"
	AuthTokenType_PasswordReset     AuthTokenType = "password_reset"
)

type AuthToken struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	TokenHash string     `json:"token_hash"`
	Type      string     `json:"type"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func NewAuthToken(userID uuid.UUID, ttl int, tokenType AuthTokenType) (*AuthToken, string, error) {
	rawString := rand.Text()
	tokenHash, err := HashToken(rawString)
	if err != nil {
		return nil, "", err
	}

	expiresAt := time.Now().Add(time.Second * time.Duration(ttl))

	return &AuthToken{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: tokenHash,
		Type:      tokenType,
		ExpiresAt: expiresAt,
	}, rawString, nil
}

func (t *AuthToken) IsExpired() bool {
	return time.Now().After(t.ExpiresAt)
}

func (t *AuthToken) IsUsed() bool {
	return t.UsedAt != nil
}

func (t *AuthToken) MarkUsed() {
	now := time.Now()
	t.UsedAt = &now
}

func (t *AuthToken) ToModel() *model.AuthTokens {
	return &model.AuthTokens{
		ID:        t.ID,
		UserID:    t.UserID,
		TokenHash: t.TokenHash,
		Type:      t.Type,
		ExpiresAt: t.ExpiresAt,
		UsedAt:    t.UsedAt,
		CreatedAt: t.CreatedAt,
	}
}

func AuthTokenFromModel(m *model.AuthTokens) *AuthToken {
	return &AuthToken{
		ID:        m.ID,
		UserID:    m.UserID,
		TokenHash: m.TokenHash,
		Type:      m.Type,
		ExpiresAt: m.ExpiresAt,
		UsedAt:    m.UsedAt,
		CreatedAt: m.CreatedAt,
	}
}

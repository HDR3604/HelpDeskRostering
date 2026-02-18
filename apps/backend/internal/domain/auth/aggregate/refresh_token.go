package aggregate

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/google/uuid"
)

type RefreshToken struct {
	ID         uuid.UUID  `json:"id"`
	UserID     uuid.UUID  `json:"user_id"`
	TokenHash  string     `json:"token_hash"`
	ExpiresAt  time.Time  `json:"expires_at"`
	RevokedAt  *time.Time `json:"revoked_at"`
	CreatedAt  time.Time  `json:"created_at"`
	ReplacedBy *uuid.UUID `json:"replaced_by"`
}

func HashToken(rawToken string) (string, error) {
	h := sha256.New()

	_, err := h.Write([]byte(rawToken))
	if err != nil {
		return "", err
	}

	encodedHash := hex.EncodeToString(h.Sum(nil))
	return encodedHash, nil
}

func NewRefreshToken(userID uuid.UUID, ttl int) (*RefreshToken, string, error) { // TTL in seconds
	rawString := rand.Text()
	tokenHash, err := HashToken(rawString)

	if err != nil {
		return nil, rawString, err
	}

	expiresAt := time.Now().Add(time.Second * time.Duration(ttl))

	return &RefreshToken{
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	}, rawString, nil
}

func (a *RefreshToken) IsExpired() bool {
	return time.Now().After(a.ExpiresAt)
}

func (a *RefreshToken) IsRevoked() bool {
	return a.RevokedAt != nil
}

func (a *RefreshToken) Revoke() error {
	if a.IsRevoked() {
		return errors.ErrRefreshTokenRevoked
	}

	now := time.Now()
	a.RevokedAt = &now

	return nil
}

func (a *RefreshToken) ToModel() *model.RefreshTokens {
	return &model.RefreshTokens{
		ID:         a.ID,
		UserID:     a.UserID,
		TokenHash:  a.TokenHash,
		ExpiresAt:  a.ExpiresAt,
		RevokedAt:  a.RevokedAt,
		CreatedAt:  a.CreatedAt,
		ReplacedBy: a.ReplacedBy,
	}
}

func RefreshTokenFromModel(m *model.RefreshTokens) *RefreshToken {
	return &RefreshToken{
		ID:         m.ID,
		UserID:     m.UserID,
		TokenHash:  m.TokenHash,
		ExpiresAt:  m.ExpiresAt,
		RevokedAt:  m.RevokedAt,
		CreatedAt:  m.CreatedAt,
		ReplacedBy: m.ReplacedBy,
	}
}

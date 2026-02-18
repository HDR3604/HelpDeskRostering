package aggregate

import (
	"crypto/rand"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/google/uuid"
)

type EmailVerification struct {
	ID        uuid.UUID  `json:"id"`
	UserID    uuid.UUID  `json:"user_id"`
	TokenHash string     `json:"token_hash"`
	ExpiresAt time.Time  `json:"expires_at"`
	UsedAt    *time.Time `json:"used_at"`
	CreatedAt time.Time  `json:"created_at"`
}

func NewEmailVerification(userID uuid.UUID, ttl int) (*EmailVerification, string, error) {
	rawString := rand.Text()
	tokenHash, err := HashToken(rawString)
	if err != nil {
		return nil, "", err
	}

	expiresAt := time.Now().Add(time.Second * time.Duration(ttl))

	return &EmailVerification{
		ID:        uuid.New(),
		UserID:    userID,
		TokenHash: tokenHash,
		ExpiresAt: expiresAt,
	}, rawString, nil
}

func (v *EmailVerification) IsExpired() bool {
	return time.Now().After(v.ExpiresAt)
}

func (v *EmailVerification) IsUsed() bool {
	return v.UsedAt != nil
}

func (v *EmailVerification) MarkUsed() {
	now := time.Now()
	v.UsedAt = &now
}

func (v *EmailVerification) ToModel() *model.EmailVerifications {
	return &model.EmailVerifications{
		ID:        v.ID,
		UserID:    v.UserID,
		TokenHash: v.TokenHash,
		ExpiresAt: v.ExpiresAt,
		UsedAt:    v.UsedAt,
		CreatedAt: v.CreatedAt,
	}
}

func EmailVerificationFromModel(m *model.EmailVerifications) *EmailVerification {
	return &EmailVerification{
		ID:        m.ID,
		UserID:    m.UserID,
		TokenHash: m.TokenHash,
		ExpiresAt: m.ExpiresAt,
		UsedAt:    m.UsedAt,
		CreatedAt: m.CreatedAt,
	}
}

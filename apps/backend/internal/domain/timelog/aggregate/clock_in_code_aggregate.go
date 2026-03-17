package aggregate

import (
	"crypto/rand"
	"log"
	"math/big"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
)

const codeCharset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

type ClockInCode struct {
	ID        uuid.UUID
	Code      string
	ExpiresAt time.Time
	CreatedAt time.Time
	CreatedBy uuid.UUID
}

func NewClockInCode(createdBy uuid.UUID, expiresInMinutes int) *ClockInCode {
	if expiresInMinutes <= 0 {
		expiresInMinutes = 60
	}

	return &ClockInCode{
		ID:        uuid.New(),
		Code:      generateCode(8),
		ExpiresAt: time.Now().UTC().Add(time.Duration(expiresInMinutes) * time.Minute),
		CreatedBy: createdBy,
	}
}

func (c *ClockInCode) IsExpired() bool {
	return time.Now().UTC().After(c.ExpiresAt)
}

func ClockInCodeFromModel(m model.ClockInCodes) ClockInCode {
	return ClockInCode{
		ID:        m.ID,
		Code:      m.Code,
		ExpiresAt: m.ExpiresAt,
		CreatedAt: m.CreatedAt,
		CreatedBy: m.CreatedBy,
	}
}

func (c *ClockInCode) ToModel() model.ClockInCodes {
	return model.ClockInCodes{
		ID:        c.ID,
		Code:      c.Code,
		ExpiresAt: c.ExpiresAt,
		CreatedAt: c.CreatedAt,
		CreatedBy: c.CreatedBy,
	}
}

func generateCode(length int) string {
	b := make([]byte, length)
	charsetLen := int64(len(codeCharset))
	for i := range b {
		n, err := rand.Int(rand.Reader, big.NewInt(charsetLen))
		if err != nil {
			// Fallback to a deterministic but safe value to avoid panics if rand.Reader fails.
			log.Printf("failed to generate secure random int for clock-in code: %v", err)
			fallbackIdx := int64(i) % charsetLen
			b[i] = codeCharset[fallbackIdx]
			continue
		}
		b[i] = codeCharset[n.Int64()]
	}
	return string(b)
}

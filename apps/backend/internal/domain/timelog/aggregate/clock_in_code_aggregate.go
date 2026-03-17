package aggregate

import (
	"crypto/rand"
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
	for i := range b {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeCharset))))
		b[i] = codeCharset[n.Int64()]
	}
	return string(b)
}

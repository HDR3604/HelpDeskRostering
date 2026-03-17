package timelog_test

import (
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type ClockInCodeAggregateTestSuite struct {
	suite.Suite
}

func TestClockInCodeAggregateTestSuite(t *testing.T) {
	suite.Run(t, new(ClockInCodeAggregateTestSuite))
}

// --- NewClockInCode ---

func (s *ClockInCodeAggregateTestSuite) TestNewClockInCode_Success() {
	createdBy := uuid.New()
	code, err := aggregate.NewClockInCode(createdBy, 30)

	s.NoError(err)
	s.NotNil(code)
	s.NotEqual(uuid.Nil, code.ID)
	s.Len(code.Code, 8)
	s.Equal(createdBy, code.CreatedBy)
	s.WithinDuration(time.Now().UTC().Add(30*time.Minute), code.ExpiresAt, 2*time.Second)
}

func (s *ClockInCodeAggregateTestSuite) TestNewClockInCode_DefaultExpiry() {
	code, err := aggregate.NewClockInCode(uuid.New(), 0)

	s.NoError(err)
	s.WithinDuration(time.Now().UTC().Add(1*time.Minute), code.ExpiresAt, 2*time.Second)
}

func (s *ClockInCodeAggregateTestSuite) TestNewClockInCode_NegativeExpiry() {
	code, err := aggregate.NewClockInCode(uuid.New(), -5)

	s.NoError(err)
	s.WithinDuration(time.Now().UTC().Add(1*time.Minute), code.ExpiresAt, 2*time.Second)
}

func (s *ClockInCodeAggregateTestSuite) TestNewClockInCode_UniqueCodesGenerated() {
	createdBy := uuid.New()
	codes := make(map[string]bool)

	for i := 0; i < 100; i++ {
		c, err := aggregate.NewClockInCode(createdBy, 1)
		s.NoError(err)
		codes[c.Code] = true
	}

	// With 36^8 possible codes, 100 should all be unique
	s.Len(codes, 100)
}

func (s *ClockInCodeAggregateTestSuite) TestNewClockInCode_CodeCharset() {
	code, err := aggregate.NewClockInCode(uuid.New(), 1)
	s.NoError(err)

	for _, ch := range code.Code {
		s.True(
			(ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'),
			"unexpected character in code: %c", ch,
		)
	}
}

// --- IsExpired ---

func (s *ClockInCodeAggregateTestSuite) TestIsExpired_NotExpired() {
	code, err := aggregate.NewClockInCode(uuid.New(), 30)
	s.NoError(err)

	s.False(code.IsExpired())
}

func (s *ClockInCodeAggregateTestSuite) TestIsExpired_Expired() {
	code, err := aggregate.NewClockInCode(uuid.New(), 1)
	s.NoError(err)
	code.ExpiresAt = time.Now().UTC().Add(-1 * time.Minute)

	s.True(code.IsExpired())
}

// --- Model conversion ---

func (s *ClockInCodeAggregateTestSuite) TestModelRoundTrip() {
	code, err := aggregate.NewClockInCode(uuid.New(), 30)
	s.NoError(err)
	code.CreatedAt = time.Now().UTC()

	m := code.ToModel()
	restored := aggregate.ClockInCodeFromModel(m)

	s.Equal(code.ID, restored.ID)
	s.Equal(code.Code, restored.Code)
	s.Equal(code.ExpiresAt, restored.ExpiresAt)
	s.Equal(code.CreatedAt, restored.CreatedAt)
	s.Equal(code.CreatedBy, restored.CreatedBy)
}

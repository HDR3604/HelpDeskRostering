package timelog_test

import (
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type TimeLogAggregateTestSuite struct {
	suite.Suite
}

func TestTimeLogAggregateTestSuite(t *testing.T) {
	suite.Run(t, new(TimeLogAggregateTestSuite))
}

// --- NewTimeLog ---

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_Success() {
	tl, err := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)

	s.NoError(err)
	s.NotNil(tl)
	s.NotEqual(uuid.Nil, tl.ID)
	s.Equal(int32(1), tl.StudentID)
	s.Equal(-61.5, tl.Longitude)
	s.Equal(10.5, tl.Latitude)
	s.Equal(50.0, tl.DistanceMeters)
	s.False(tl.IsFlagged)
	s.Nil(tl.FlagReason)
	s.Nil(tl.ExitAt)
	s.WithinDuration(time.Now().UTC(), tl.EntryAt, 2*time.Second)
}

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_InvalidStudentID() {
	tests := []struct {
		name      string
		studentID int32
	}{
		{"zero", 0},
		{"negative", -1},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			tl, err := aggregate.NewTimeLog(tt.studentID, -61.5, 10.5, 50.0)

			s.ErrorIs(err, timelogErrors.ErrInvalidStudentID)
			s.Nil(tl)
		})
	}
}

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_ZeroDistance() {
	tl, err := aggregate.NewTimeLog(1, 0, 0, 0)

	s.NoError(err)
	s.NotNil(tl)
	s.Equal(0.0, tl.DistanceMeters)
}

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_InvalidLongitude() {
	tests := []struct {
		name string
		lon  float64
	}{
		{"too low", -181},
		{"too high", 181},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			tl, err := aggregate.NewTimeLog(1, tt.lon, 10.0, 50.0)

			s.ErrorIs(err, timelogErrors.ErrInvalidCoordinates)
			s.Nil(tl)
		})
	}
}

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_InvalidLatitude() {
	tests := []struct {
		name string
		lat  float64
	}{
		{"too low", -91},
		{"too high", 91},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			tl, err := aggregate.NewTimeLog(1, -61.5, tt.lat, 50.0)

			s.ErrorIs(err, timelogErrors.ErrInvalidCoordinates)
			s.Nil(tl)
		})
	}
}

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_NegativeDistance() {
	tl, err := aggregate.NewTimeLog(1, -61.5, 10.5, -1)

	s.ErrorIs(err, timelogErrors.ErrInvalidCoordinates)
	s.Nil(tl)
}

func (s *TimeLogAggregateTestSuite) TestNewTimeLog_BoundaryCoordinates() {
	tl, err := aggregate.NewTimeLog(1, 180, 90, 0)

	s.NoError(err)
	s.NotNil(tl)
	s.Equal(180.0, tl.Longitude)
	s.Equal(90.0, tl.Latitude)

	tl, err = aggregate.NewTimeLog(1, -180, -90, 0)

	s.NoError(err)
	s.NotNil(tl)
	s.Equal(-180.0, tl.Longitude)
	s.Equal(-90.0, tl.Latitude)
}

// --- ClockOut ---

func (s *TimeLogAggregateTestSuite) TestClockOut_Success() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)

	err := tl.ClockOut(time.Now().UTC())

	s.NoError(err)
	s.NotNil(tl.ExitAt)
	s.WithinDuration(time.Now().UTC(), *tl.ExitAt, 2*time.Second)
}

func (s *TimeLogAggregateTestSuite) TestClockOut_AlreadyClockedOut() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)
	s.NoError(tl.ClockOut(time.Now().UTC()))

	err := tl.ClockOut(time.Now().UTC())

	s.ErrorIs(err, timelogErrors.ErrAlreadyClockedOut)
}

// --- Flag ---

func (s *TimeLogAggregateTestSuite) TestFlag_Success() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)

	err := tl.Flag("distance exceeds threshold")

	s.NoError(err)
	s.True(tl.IsFlagged)
	s.Require().NotNil(tl.FlagReason)
	s.Equal("distance exceeds threshold", *tl.FlagReason)
}

func (s *TimeLogAggregateTestSuite) TestFlag_EmptyReason() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)

	err := tl.Flag("")

	s.ErrorIs(err, timelogErrors.ErrInvalidFlagReason)
	s.False(tl.IsFlagged)
	s.Nil(tl.FlagReason)
}

func (s *TimeLogAggregateTestSuite) TestFlag_OverwritesPreviousFlag() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)
	s.NoError(tl.Flag("first reason"))

	err := tl.Flag("second reason")

	s.NoError(err)
	s.True(tl.IsFlagged)
	s.Equal("second reason", *tl.FlagReason)
}

// --- Unflag ---

func (s *TimeLogAggregateTestSuite) TestUnflag_Success() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)
	s.NoError(tl.Flag("suspicious"))

	tl.Unflag()

	s.False(tl.IsFlagged)
	s.Nil(tl.FlagReason)
}

func (s *TimeLogAggregateTestSuite) TestUnflag_WhenNotFlagged() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)

	tl.Unflag()

	s.False(tl.IsFlagged)
	s.Nil(tl.FlagReason)
}

// --- Model conversion ---

func (s *TimeLogAggregateTestSuite) TestModelRoundTrip() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 150.0)
	tl.CreatedAt = time.Now().UTC()
	s.NoError(tl.ClockOut(time.Now().UTC()))
	s.NoError(tl.Flag("too far"))

	m := tl.ToModel()
	restored := aggregate.TimeLogFromModel(m)

	s.Equal(tl.ID, restored.ID)
	s.Equal(tl.StudentID, restored.StudentID)
	s.Equal(tl.EntryAt, restored.EntryAt)
	s.Require().NotNil(restored.ExitAt)
	s.Equal(*tl.ExitAt, *restored.ExitAt)
	s.Equal(tl.Longitude, restored.Longitude)
	s.Equal(tl.Latitude, restored.Latitude)
	s.Equal(tl.DistanceMeters, restored.DistanceMeters)
	s.Equal(tl.IsFlagged, restored.IsFlagged)
	s.Require().NotNil(restored.FlagReason)
	s.Equal(*tl.FlagReason, *restored.FlagReason)
}

func (s *TimeLogAggregateTestSuite) TestModelRoundTrip_NilFields() {
	tl, _ := aggregate.NewTimeLog(1, -61.5, 10.5, 50.0)
	tl.CreatedAt = time.Now().UTC()

	m := tl.ToModel()
	restored := aggregate.TimeLogFromModel(m)

	s.Nil(restored.ExitAt)
	s.False(restored.IsFlagged)
	s.Nil(restored.FlagReason)
}

package schedule_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
)

type ScheduleAggregateTestSuite struct {
	suite.Suite
}

func TestScheduleAggregateTestSuite(t *testing.T) {
	suite.Run(t, new(ScheduleAggregateTestSuite))
}

// --- NewSchedule ---

func (s *ScheduleAggregateTestSuite) TestNewSchedule_Success() {
	from := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)
	to := time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC)

	schedule, err := aggregate.NewSchedule("Fall 2025", from, &to)

	s.Require().NoError(err)
	s.Require().NotNil(schedule)
	s.Equal("Fall 2025", schedule.Title)
	s.Equal(from, schedule.EffectiveFrom)
	s.Equal(&to, schedule.EffectiveTo)
	s.False(schedule.IsActive)
	s.Nil(schedule.ArchivedAt)
	s.NotEqual(uuid.Nil, schedule.ScheduleID)
}

func (s *ScheduleAggregateTestSuite) TestNewSchedule_NilEffectiveTo() {
	from := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)

	schedule, err := aggregate.NewSchedule("Open-ended Schedule", from, nil)

	s.Require().NoError(err)
	s.Require().NotNil(schedule)
	s.Nil(schedule.EffectiveTo)
}

func (s *ScheduleAggregateTestSuite) TestNewSchedule_EmptyTitle() {
	from := time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name  string
		title string
	}{
		{"empty string", ""},
		{"whitespace only", "   "},
		{"tab only", "\t"},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			schedule, err := aggregate.NewSchedule(tt.title, from, nil)
			s.ErrorIs(err, errors.ErrInvalidTitle)
			s.Nil(schedule)
		})
	}
}

func (s *ScheduleAggregateTestSuite) TestNewSchedule_InvalidEffectivePeriod() {
	tests := []struct {
		name string
		from time.Time
		to   time.Time
	}{
		{
			"effective_to before effective_from",
			time.Date(2025, 12, 31, 0, 0, 0, 0, time.UTC),
			time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC),
		},
		{
			"effective_to equals effective_from",
			time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
			time.Date(2025, 9, 1, 0, 0, 0, 0, time.UTC),
		},
	}

	for _, tt := range tests {
		s.Run(tt.name, func() {
			schedule, err := aggregate.NewSchedule("Test", tt.from, &tt.to)
			s.ErrorIs(err, errors.ErrInvalidEffectivePeriod)
			s.Nil(schedule)
		})
	}
}

// --- Activate / Deactivate ---

func (s *ScheduleAggregateTestSuite) TestActivate() {
	schedule := &aggregate.Schedule{IsActive: false}

	schedule.Activate()

	s.True(schedule.IsActive)
}

func (s *ScheduleAggregateTestSuite) TestActivate_AlreadyActive() {
	schedule := &aggregate.Schedule{IsActive: true}

	schedule.Activate()

	s.True(schedule.IsActive)
}

func (s *ScheduleAggregateTestSuite) TestDeactivate() {
	schedule := &aggregate.Schedule{IsActive: true}

	schedule.Deactivate()

	s.False(schedule.IsActive)
}

func (s *ScheduleAggregateTestSuite) TestDeactivate_AlreadyInactive() {
	schedule := &aggregate.Schedule{IsActive: false}

	schedule.Deactivate()

	s.False(schedule.IsActive)
}

// --- Archive / Unarchive ---

func (s *ScheduleAggregateTestSuite) TestArchive() {
	schedule := &aggregate.Schedule{IsActive: true}

	schedule.Archive()

	s.False(schedule.IsActive, "archive should deactivate the schedule")
	s.NotNil(schedule.ArchivedAt)
}

func (s *ScheduleAggregateTestSuite) TestArchive_AlreadyArchived() {
	archivedAt := time.Date(2025, 1, 1, 0, 0, 0, 0, time.UTC)
	schedule := &aggregate.Schedule{ArchivedAt: &archivedAt, IsActive: false}

	schedule.Archive()

	s.Equal(&archivedAt, schedule.ArchivedAt, "should not change existing archived_at")
}

func (s *ScheduleAggregateTestSuite) TestUnarchive() {
	archivedAt := time.Now()
	schedule := &aggregate.Schedule{ArchivedAt: &archivedAt, IsActive: false}

	schedule.Unarchive()

	s.Nil(schedule.ArchivedAt)
}

func (s *ScheduleAggregateTestSuite) TestUnarchive_NotArchived() {
	schedule := &aggregate.Schedule{ArchivedAt: nil}

	schedule.Unarchive()

	s.Nil(schedule.ArchivedAt)
}

// --- Model conversion ---

func (s *ScheduleAggregateTestSuite) TestToModel_FromModel_RoundTrip() {
	now := time.Now().Truncate(time.Microsecond)
	updatedAt := now.Add(time.Hour)
	effectiveTo := now.Add(24 * time.Hour * 90)
	id := uuid.New()
	createdBy := uuid.New()

	original := &aggregate.Schedule{
		ScheduleID:           id,
		Title:                "Test Schedule",
		IsActive:             true,
		Assignments:          json.RawMessage(`{"key":"value"}`),
		AvailabilityMetadata: json.RawMessage(`{"avail":"data"}`),
		CreatedAt:            now,
		CreatedBy:            createdBy,
		UpdatedAt:            &updatedAt,
		ArchivedAt:           nil,
		EffectiveFrom:        now,
		EffectiveTo:          &effectiveTo,
	}

	m := original.ToModel()

	s.Equal(id, m.ScheduleID)
	s.Equal("Test Schedule", m.Title)
	s.True(m.IsActive)
	s.Equal(`{"key":"value"}`, m.Assignments)
	s.Equal(`{"avail":"data"}`, m.AvailabilityMetadata)
	s.Equal(createdBy, m.CreatedBy)

	roundTripped := aggregate.ScheduleFromModel(m)

	s.Equal(original.ScheduleID, roundTripped.ScheduleID)
	s.Equal(original.Title, roundTripped.Title)
	s.Equal(original.IsActive, roundTripped.IsActive)
	s.JSONEq(string(original.Assignments), string(roundTripped.Assignments))
	s.JSONEq(string(original.AvailabilityMetadata), string(roundTripped.AvailabilityMetadata))
	s.Equal(original.CreatedBy, roundTripped.CreatedBy)
}

func (s *ScheduleAggregateTestSuite) TestFromModel_HandlesNilFields() {
	m := model.Schedules{
		ScheduleID:           uuid.New(),
		Title:                "Minimal",
		IsActive:             false,
		Assignments:          "{}",
		AvailabilityMetadata: "{}",
		CreatedAt:            time.Now(),
		CreatedBy:            uuid.New(),
		UpdatedAt:            nil,
		ArchivedAt:           nil,
		EffectiveFrom:        time.Now(),
		EffectiveTo:          nil,
	}

	schedule := aggregate.ScheduleFromModel(m)

	s.Nil(schedule.UpdatedAt)
	s.Nil(schedule.ArchivedAt)
	s.Nil(schedule.EffectiveTo)
}

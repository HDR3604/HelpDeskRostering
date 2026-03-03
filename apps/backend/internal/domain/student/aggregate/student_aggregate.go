package aggregate

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/helpers/validation"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"
)

// Availability maps day index ("0"–"4", Mon–Fri) to a slice of hours in 24h format.
type Availability map[string][]int

type Student struct {
	StudentID          int32                    `json:"student_id"`
	EmailAddress       string                   `json:"email_address"`
	FirstName          string                   `json:"first_name"`
	LastName           string                   `json:"last_name"`
	PhoneNumber        string                   `json:"phone_number"`
	TranscriptMetadata types.TranscriptMetadata `json:"transcript_metadata"`
	Availability       Availability             `json:"availability"`
	CreatedAt          time.Time                `json:"created_at"`
	UpdatedAt          *time.Time               `json:"updated_at,omitempty"`
	DeletedAt          *time.Time               `json:"deleted_at,omitempty"`
	AcceptedAt         *time.Time               `json:"accepted_at,omitempty"`
	RejectedAt         *time.Time               `json:"rejected_at,omitempty"`
	MinWeeklyHours     float64                  `json:"min_weekly_hours"`
	MaxWeeklyHours     *float64                 `json:"max_weekly_hours,omitempty"`
}

// NewStudent creates a new Student from an application submission.
func NewStudent(emailAddress string, phoneNumber string, transcriptMetadata types.TranscriptMetadata, availability json.RawMessage) (*Student, error) {
	emailAddress = strings.TrimSpace(emailAddress)
	phoneNumber = strings.TrimSpace(phoneNumber)

	if err := validation.ValidateStudentEmail(emailAddress); err != nil {
		return nil, studentErrors.ErrInvalidEmail
	}

	if err := validation.ValidatePhoneNumber(phoneNumber); err != nil {
		return nil, studentErrors.ErrInvalidPhone
	}

	if err := validation.ValidateTranscriptMetadata(&transcriptMetadata); err != nil {
		return nil, err
	}

	if err := validation.ValidateAvailability(availability); err != nil {
		return nil, err
	}

	var avail Availability
	if err := json.Unmarshal(availability, &avail); err != nil {
		return nil, err
	}

	studentID, err := strconv.ParseInt(transcriptMetadata.StudentID, 10, 32)
	if err != nil {
		return nil, studentErrors.ErrInvalidStudentID
	}

	return &Student{
		StudentID:          int32(studentID),
		EmailAddress:       emailAddress,
		FirstName:          transcriptMetadata.FirstName,
		LastName:           transcriptMetadata.LastName,
		PhoneNumber:        phoneNumber,
		Availability:       avail,
		TranscriptMetadata: transcriptMetadata,
		MinWeeklyHours:     8,
	}, nil
}

func (s *Student) Accept() error {
	if s.DeletedAt != nil {
		return studentErrors.ErrDeleted
	}
	if s.AcceptedAt != nil {
		return studentErrors.ErrAlreadyAccepted
	}
	now := time.Now()
	s.AcceptedAt = &now
	s.RejectedAt = nil
	s.UpdatedAt = &now
	return nil
}

func (s *Student) Reject() error {
	if s.DeletedAt != nil {
		return studentErrors.ErrDeleted
	}
	if s.RejectedAt != nil {
		return studentErrors.ErrAlreadyRejected
	}
	now := time.Now()
	s.RejectedAt = &now
	s.AcceptedAt = nil
	s.UpdatedAt = &now
	return nil
}

func (s *Student) Delete() error {
	if s.DeletedAt != nil {
		return studentErrors.ErrDeleted
	}
	now := time.Now()
	s.DeletedAt = &now
	s.UpdatedAt = &now
	return nil
}

func (s *Student) UpdatePhoneNumber(phoneNumber string) error {
	phoneNumber = strings.TrimSpace(phoneNumber)
	if err := validation.ValidatePhoneNumber(phoneNumber); err != nil {
		return studentErrors.ErrInvalidPhone
	}
	now := time.Now()
	s.PhoneNumber = phoneNumber
	s.UpdatedAt = &now
	return nil
}

func (s *Student) UpdateAvailability(availability json.RawMessage) error {
	if err := validation.ValidateAvailability(availability); err != nil {
		return err
	}
	var avail Availability
	if err := json.Unmarshal(availability, &avail); err != nil {
		return err
	}
	now := time.Now()
	s.Availability = avail
	s.UpdatedAt = &now
	return nil
}

// ToModel converts the Student aggregate to the database model.
func (s *Student) ToModel() *model.Students {
	transcriptJSON, _ := json.Marshal(s.TranscriptMetadata)
	availabilityJSON, _ := json.Marshal(s.Availability)

	return &model.Students{
		StudentID:          s.StudentID,
		EmailAddress:       s.EmailAddress,
		FirstName:          s.FirstName,
		LastName:           s.LastName,
		PhoneNumber:        s.PhoneNumber,
		TranscriptMetadata: string(transcriptJSON),
		Availability:       string(availabilityJSON),
		CreatedAt:          s.CreatedAt,
		UpdatedAt:          s.UpdatedAt,
		DeletedAt:          s.DeletedAt,
		AcceptedAt:         s.AcceptedAt,
		RejectedAt:         s.RejectedAt,
		MinWeeklyHours:     s.MinWeeklyHours,
		MaxWeeklyHours:     s.MaxWeeklyHours,
	}
}

// StudentFromModel converts the database model to a Student aggregate.
func StudentFromModel(m *model.Students) (*Student, error) {
	var transcript types.TranscriptMetadata
	if err := json.Unmarshal([]byte(m.TranscriptMetadata), &transcript); err != nil {
		return nil, err
	}

	var avail Availability
	if err := json.Unmarshal([]byte(m.Availability), &avail); err != nil {
		return nil, err
	}

	return &Student{
		StudentID:          m.StudentID,
		EmailAddress:       m.EmailAddress,
		FirstName:          m.FirstName,
		LastName:           m.LastName,
		PhoneNumber:        m.PhoneNumber,
		TranscriptMetadata: transcript,
		Availability:       avail,
		CreatedAt:          m.CreatedAt,
		UpdatedAt:          m.UpdatedAt,
		DeletedAt:          m.DeletedAt,
		AcceptedAt:         m.AcceptedAt,
		RejectedAt:         m.RejectedAt,
		MinWeeklyHours:     m.MinWeeklyHours,
		MaxWeeklyHours:     m.MaxWeeklyHours,
	}, nil
}

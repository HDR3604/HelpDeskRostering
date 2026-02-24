package aggregate

import (
	"encoding/json"
	"strconv"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/helpers/validation"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"
)

// TODO: Add rejection email template

type Student struct {
	StudentID          int32                    `json:"student_id"`
	EmailAddress       string                   `json:"email_address"`
	FirstName          string                   `json:"first_name"`
	LastName           string                   `json:"last_name"`
	PhoneNumber        string                   `json:"phone_number"`
	TranscriptMetadata types.TranscriptMetadata `json:"transcript_metadata"` // transcript metadata contains the relevant extracted information from their provided transcripts. It should follow the below structure: { overall_gpa: float; degree_gpa: float; degree_programme: string; courses: []maps[string]float; current_level: string; }
	Availability       Availability             `json:"availability"`        // Availability contains a json indicating the availability of a student for each time slot given. The times a represented in 24-hour format. e.g. 8 represents 8 am - 9am { 0: [8...16], . . 4: [8...16] // 24 hr format }
	CreatedAt          time.Time                `json:"created_at"`
	UpdatedAt          *time.Time               `json:"updated_at,omitempty"`
	DeletedAt          *time.Time               `json:"delete_at,omitempty"`
	AcceptedAt         *time.Time               `json:"accepted_at,omitempty"`
	RejectedAt         *time.Time               `json:"rejected_at,omitempty"`
	MinWeeklyHours     float64                  `json:"min_weekly_hours"`           // Minimum hours per week this student should be scheduled (fairness baseline)
	MaxWeeklyHours     *float64                 `json:"max_weekly_hours,omitempty"` // Maximum hours per week this student can work
}

type Availability struct {
}

// Create a student
func NewStudent(emailAddress string, phoneNumber string, transcriptMetadata types.TranscriptMetadata, availability json.RawMessage) (*Student, error) {
	// Validation
	emailAddress = strings.TrimSpace(emailAddress)
	phoneNumber = strings.TrimSpace(phoneNumber)

	if err := validation.ValidateEmail(emailAddress); err != nil {

	}

	if err := validation.ValidatePhoneNumber(phoneNumber); err != nil {

	}

	if err := validation.ValidateTranscriptMetadata(&transcriptMetadata); err != nil {

	}

	if err := validation.ValidateAvailability(availability); err != nil {

	}

	var studentAvailability Availability
	if err := json.Unmarshal(availability, &studentAvailability); err != nil {

	}

	studentID, err := strconv.ParseInt(transcriptMetadata.StudentID, 10, 32)
	if err != nil {

	}

	newStudent := &Student{
		StudentID:    int32(studentID),
		EmailAddress: emailAddress,
		FirstName:    transcriptMetadata.FirstName,
		LastName:     transcriptMetadata.LastName,
		PhoneNumber:  phoneNumber,
		Availability: studentAvailability,
		TranscriptMetadata: transcriptMetadata,
		MinWeeklyHours: 8,
	}

	return newStudent, nil
}

func (a *Student) Accept() error {
	return nil
}

func (a *Student) Reject() error {
	return nil
}

func (a *Student) Delete() error {
	return nil
}

func (a *Student) UpdateEmail(email string) error {
	return nil
}

func (a *Student) UpdatePhoneNumber(phoneNumber string) error {
	return nil
}

func (a *Student) ToModel() *model.Students {
	return nil
}

func StudentModelToAggregate() *Student {
	return nil
}

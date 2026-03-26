package dtos

import (
	"encoding/json"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"
)

type ApplyRequest struct {
	StudentID       string          `json:"student_id"`
	FirstName       string          `json:"first_name"`
	LastName        string          `json:"last_name"`
	Email           string          `json:"email"`
	PhoneNumber     string          `json:"phone_number"`
	DegreeProgramme string          `json:"degree_programme"`
	Major           string          `json:"major"`
	CurrentYear     int             `json:"current_year"`
	OverallGPA      *float64        `json:"overall_gpa"`
	DegreeGPA       *float64        `json:"degree_gpa"`
	Courses         json.RawMessage `json:"courses"`
	Availability    json.RawMessage `json:"availability"`
}

type BulkStudentRequest struct {
	StudentIDs []int32 `json:"student_ids"`
}

type UpdateStudentRequest struct {
	PhoneNumber         *string          `json:"phone_number,omitempty"`
	Availability        *json.RawMessage `json:"availability,omitempty"`
	MinWeeklyHours      *float64         `json:"min_weekly_hours,omitempty"`
	MaxWeeklyHours      *float64         `json:"max_weekly_hours,omitempty"`
	Courses             []CourseDTO      `json:"courses,omitempty"`
	OverallGPA          *float64         `json:"overall_gpa,omitempty"`
	DegreeGPA           *float64         `json:"degree_gpa,omitempty"`
	CurrentYear         *int             `json:"current_year,omitempty"`
	CurrentProgramme    *string          `json:"current_programme,omitempty"`
	Major               *string          `json:"major,omitempty"`
	TranscriptFirstName *string          `json:"transcript_first_name,omitempty"`
	TranscriptLastName  *string          `json:"transcript_last_name,omitempty"`
	TranscriptStudentID *string          `json:"transcript_student_id,omitempty"`
}

type CourseDTO struct {
	Code  string  `json:"code"`
	Title string  `json:"title"`
	Grade *string `json:"grade"`
}

type StudentResponse struct {
	StudentID          int32                    `json:"student_id"`
	EmailAddress       string                   `json:"email_address"`
	FirstName          string                   `json:"first_name"`
	LastName           string                   `json:"last_name"`
	PhoneNumber        string                   `json:"phone_number"`
	TranscriptMetadata types.TranscriptMetadata `json:"transcript_metadata"`
	Availability       aggregate.Availability   `json:"availability"`
	CreatedAt          string                   `json:"created_at"`
	UpdatedAt          *string                  `json:"updated_at,omitempty"`
	AcceptedAt         *string                  `json:"accepted_at,omitempty"`
	RejectedAt         *string                  `json:"rejected_at,omitempty"`
	MinWeeklyHours     float64                  `json:"min_weekly_hours"`
	MaxWeeklyHours     *float64                 `json:"max_weekly_hours,omitempty"`
	Status             string                   `json:"status"`
}

func StudentToResponse(s *aggregate.Student) StudentResponse {
	resp := StudentResponse{
		StudentID:          s.StudentID,
		EmailAddress:       s.EmailAddress,
		FirstName:          s.FirstName,
		LastName:           s.LastName,
		PhoneNumber:        s.PhoneNumber,
		TranscriptMetadata: s.TranscriptMetadata,
		Availability:       s.Availability,
		CreatedAt:          s.CreatedAt.Format("2006-01-02 15:04:05"),
		MinWeeklyHours:     s.MinWeeklyHours,
		MaxWeeklyHours:     s.MaxWeeklyHours,
		Status:             studentStatus(s),
	}

	if s.UpdatedAt != nil {
		formatted := s.UpdatedAt.Format("2006-01-02 15:04:05")
		resp.UpdatedAt = &formatted
	}
	if s.AcceptedAt != nil {
		formatted := s.AcceptedAt.Format("2006-01-02 15:04:05")
		resp.AcceptedAt = &formatted
	}
	if s.RejectedAt != nil {
		formatted := s.RejectedAt.Format("2006-01-02 15:04:05")
		resp.RejectedAt = &formatted
	}

	return resp
}

func StudentsToResponse(students []*aggregate.Student) []StudentResponse {
	responses := make([]StudentResponse, len(students))
	for i, s := range students {
		responses[i] = StudentToResponse(s)
	}
	return responses
}

func studentStatus(s *aggregate.Student) string {
	if s.DeletedAt != nil {
		return "deactivated"
	}
	if s.AcceptedAt != nil {
		return "accepted"
	}
	if s.RejectedAt != nil {
		return "rejected"
	}
	return "pending"
}

// ToTranscriptMetadata converts the flat ApplyRequest fields into a TranscriptMetadata struct.
func (r *ApplyRequest) ToTranscriptMetadata() (types.TranscriptMetadata, error) {
	var courses []types.CourseResult
	if r.Courses != nil {
		if err := json.Unmarshal(r.Courses, &courses); err != nil {
			return types.TranscriptMetadata{}, fmt.Errorf("invalid courses: %w", err)
		}
	}

	return types.TranscriptMetadata{
		FirstName:        r.FirstName,
		LastName:         r.LastName,
		StudentID:        r.StudentID,
		CurrentProgramme: r.DegreeProgramme,
		Major:            r.Major,
		CurrentYear:      r.CurrentYear,
		OverallGPA:       r.OverallGPA,
		DegreeGPA:        r.DegreeGPA,
		Courses:          courses,
	}, nil
}

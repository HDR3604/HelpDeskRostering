package dtos

import "github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"

type ExtractTranscriptResponse struct {
	FirstName        string              `json:"first_name"`
	MiddleName       string              `json:"middle_name"`
	LastName         string              `json:"last_name"`
	StudentID        string              `json:"student_id"`
	CurrentProgramme string              `json:"current_programme"`
	Major            string              `json:"major"`
	CurrentTerm      string              `json:"current_term"`
	CurrentYear      int                 `json:"current_year"`
	DegreeGPA        *float64            `json:"degree_gpa"`
	OverallGPA       *float64            `json:"overall_gpa"`
	Courses          []types.CourseResult `json:"courses"`
}

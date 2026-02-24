package types

type CourseResult struct {
	Code  string  `json:"code"`
	Title string  `json:"title"`
	Grade *string `json:"grade"`
}

type TranscriptMetadata struct {
	FirstName        string         `json:"first_name"`
	MiddleName       string         `json:"middle_name"`
	LastName         string         `json:"last_name"`
	StudentID        string         `json:"student_id"`
	CurrentProgramme string         `json:"current_programme"`
	Major            string         `json:"major"`
	CurrentTerm      string         `json:"current_term"`
	CurrentYear      int            `json:"current_year"`
	DegreeGPA        *float64       `json:"degree_gpa"`
	OverallGPA       *float64       `json:"overall_gpa"`
	Courses          []CourseResult `json:"courses"`
}

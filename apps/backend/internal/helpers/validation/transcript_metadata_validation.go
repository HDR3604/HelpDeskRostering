package validation

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"
)

func ValidateTranscriptMetadata(metadata *types.TranscriptMetadata) error {
	if metadata == nil {
		return fmt.Errorf("transcript metadata is required")
	}
	if strings.TrimSpace(metadata.FirstName) == "" {
		return fmt.Errorf("transcript first name is required")
	}
	if strings.TrimSpace(metadata.LastName) == "" {
		return fmt.Errorf("transcript last name is required")
	}
	if strings.TrimSpace(metadata.StudentID) == "" {
		return fmt.Errorf("transcript student ID is required")
	}
	if _, err := strconv.ParseInt(metadata.StudentID, 10, 32); err != nil {
		return fmt.Errorf("transcript student ID must be a valid number")
	}
	if strings.TrimSpace(metadata.CurrentProgramme) == "" {
		return fmt.Errorf("transcript current programme is required")
	}
	if metadata.CurrentYear < 1 {
		return fmt.Errorf("transcript current year must be at least 1")
	}

	const maxGPA = 4.3
	if metadata.DegreeGPA != nil && (*metadata.DegreeGPA < 0 || *metadata.DegreeGPA > maxGPA) {
		return fmt.Errorf("degree GPA must be between 0 and %.1f", maxGPA)
	}
	if metadata.OverallGPA != nil && (*metadata.OverallGPA < 0 || *metadata.OverallGPA > maxGPA) {
		return fmt.Errorf("overall GPA must be between 0 and %.1f", maxGPA)
	}

	return nil
}

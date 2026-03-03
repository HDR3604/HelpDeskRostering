package validation

import (
	"errors"
	"regexp"
	"strings"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)

const studentEmailSuffix = "@my.uwi.edu"

func ValidateStudentEmail(email string) error {
	if strings.TrimSpace(email) == "" {
		return errors.New("email is required")
	}
	if !emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}
	if !strings.HasSuffix(strings.ToLower(email), studentEmailSuffix) {
		return errors.New("email must end with @my.uwi.edu")
	}
	return nil
}

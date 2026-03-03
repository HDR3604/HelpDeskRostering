package validation

import (
	"errors"
	"regexp"
	"strings"
)

// phoneRegex accepts digits, spaces, hyphens, parentheses, and an optional leading +.
// Requires at least 7 digits total (covers local and international formats).
var phoneRegex = regexp.MustCompile(`^\+?[\d\s\-()]{7,20}$`)

func ValidatePhoneNumber(phoneNumber string) error {
	phoneNumber = strings.TrimSpace(phoneNumber)
	if phoneNumber == "" {
		return errors.New("phone number is required")
	}
	if !phoneRegex.MatchString(phoneNumber) {
		return errors.New("invalid phone number format")
	}
	return nil
}

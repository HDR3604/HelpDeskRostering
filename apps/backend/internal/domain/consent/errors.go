package consent

import "errors"

var (
	ErrConsentNotFound       = errors.New("consent record not found")
	ErrInvalidConsentVersion = errors.New("invalid consent version")
)

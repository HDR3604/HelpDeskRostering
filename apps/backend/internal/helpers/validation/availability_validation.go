package validation

import (
	"encoding/json"
	"fmt"
	"strconv"
)

func ValidateAvailability(availability json.RawMessage) error {
	if len(availability) == 0 {
		return fmt.Errorf("availability is required")
	}

	var parsed map[string][]int
	if err := json.Unmarshal(availability, &parsed); err != nil {
		return fmt.Errorf("availability must be a JSON object mapping day indices to hour arrays")
	}

	if len(parsed) == 0 {
		return fmt.Errorf("availability must contain at least one day")
	}

	for key, hours := range parsed {
		day, err := strconv.Atoi(key)
		if err != nil || day < 0 || day > 4 {
			return fmt.Errorf("invalid day key %q: must be \"0\" through \"4\" (Mon–Fri)", key)
		}
		for _, h := range hours {
			if h < 0 || h > 23 {
				return fmt.Errorf("invalid hour %d for day %q: must be 0–23", h, key)
			}
		}
	}

	return nil
}

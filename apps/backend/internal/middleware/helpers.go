package middleware

import (
	"encoding/json"
	"log"
	"net/http"
)

func writeHeader(w http.ResponseWriter, message string, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": message}); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}

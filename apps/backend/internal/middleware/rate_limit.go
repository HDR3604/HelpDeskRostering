package middleware

import (
	"net/http"
	"time"

	"github.com/go-chi/httprate"
)

// RateLimit returns a middleware that limits requests per IP address
// to the specified number of requests per minute.
func RateLimit(requestsPerMin int) func(http.Handler) http.Handler {
	return httprate.LimitByIP(requestsPerMin, 1*time.Minute)
}

package middleware

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
)

func JWTAuth(authService service.AuthServiceInterface) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				writeUnauthorized(w, "missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeUnauthorized(w, "invalid authorization header format")
				return
			}

			claims, err := authService.ValidateAccessToken(parts[1])
			if err != nil {
				writeUnauthorized(w, "invalid or expired token")
				return
			}

			ac := database.AuthContext{
				UserID:    claims.Subject,
				Role:      claims.Role,
				StudentID: claims.StudentID,
			}

			ctx := database.WithAuthContext(r.Context(), ac)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func writeUnauthorized(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	if err := json.NewEncoder(w).Encode(map[string]string{"error": message}); err != nil {
		log.Printf("failed to encode JSON response: %v", err)
	}
}

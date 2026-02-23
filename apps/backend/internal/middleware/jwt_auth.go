package middleware

import (
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
				writeHeader(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				writeHeader(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			claims, err := authService.ValidateAccessToken(parts[1])
			if err != nil {
				writeHeader(w, "invalid or expired token", http.StatusUnauthorized)
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

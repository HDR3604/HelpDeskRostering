package middleware

import (
	"net/http"
	"slices"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
)

func Permission(roles []aggregate.Role) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			authContext, ok := database.GetAuthContextFromContext(r.Context())
			if !ok {
				writeHeader(w, "missing auth context from request", http.StatusForbidden)
				return
			}

			if !slices.Contains(roles, aggregate.Role(authContext.Role)) {
				writeHeader(w, "access not allowed", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

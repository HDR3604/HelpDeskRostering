package application

import (
	"fmt"
	"net/http"

	authHandler "github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	authService "github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	authMiddleware "github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func registerRoutes(
	r *chi.Mux,
	cfg Config,
	authHdl *authHandler.AuthHandler,
	authSvc authService.AuthServiceInterface,
	scheduleHdl *scheduleHandler.ScheduleHandler,
	scheduleGenerationHdl *scheduleHandler.ScheduleGenerationHandler,
	shiftTemplateHdl *scheduleHandler.ShiftTemplateHandler,
	schedulerConfigHdl *scheduleHandler.SchedulerConfigHandler,
) {
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Public auth routes (no JWT middleware)
		authHdl.RegisterRoutes(r)

		// Protected routes (JWT middleware)
		r.Group(func(r chi.Router) {
			if cfg.Environment != "production" && cfg.DevUserID != "" {
				r.Use(devAuthMiddleware(cfg.DevUserID))
			} else {
				r.Use(authMiddleware.JWTAuth(authSvc))
			}

			authHdl.RegisterAuthenticatedRoutes(r)
			scheduleHdl.RegisterRoutes(r)
			scheduleGenerationHdl.RegisterRoutes(r)
			shiftTemplateHdl.RegisterRoutes(r)
			schedulerConfigHdl.RegisterRoutes(r)
		})
	})
}

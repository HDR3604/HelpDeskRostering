package application

import (
	"fmt"
	"net/http"

	authHandler "github.com/HDR3604/HelpDeskApp/internal/domain/auth/handler"
	authService "github.com/HDR3604/HelpDeskApp/internal/domain/auth/service"
	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	studentHandler "github.com/HDR3604/HelpDeskApp/internal/domain/student/handler"
	transcriptHandler "github.com/HDR3604/HelpDeskApp/internal/domain/transcript/handler"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userHandler "github.com/HDR3604/HelpDeskApp/internal/domain/user/handler"
	authMiddleware "github.com/HDR3604/HelpDeskApp/internal/middleware"
	"github.com/go-chi/chi/v5"
)

func registerRoutes(
	r *chi.Mux,
	cfg Config,
	authHdl *authHandler.AuthHandler,
	authSvc authService.AuthServiceInterface,
	transcriptHdl *transcriptHandler.TranscriptHandler,
	scheduleHdl *scheduleHandler.ScheduleHandler,
	scheduleGenerationHdl *scheduleHandler.ScheduleGenerationHandler,
	shiftTemplateHdl *scheduleHandler.ShiftTemplateHandler,
	schedulerConfigHdl *scheduleHandler.SchedulerConfigHandler,
	studentHdl *studentHandler.StudentHandler,
	userHdl *userHandler.UserHandler,
) {
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	r.Route("/api/v1", func(r chi.Router) {
		// Public routes — rate limited by IP
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware.RateLimit(cfg.RateLimitRPM))
			authHdl.RegisterRoutes(r)
			transcriptHdl.RegisterRoutes(r)
			studentHdl.RegisterPublicRoutes(r)
		})

		// Protected routes (JWT middleware)
		r.Group(func(r chi.Router) {
			if cfg.Environment != "production" && cfg.DevUserID != "" {
				r.Use(devAuthMiddleware(cfg.DevUserID))
			} else {
				r.Use(authMiddleware.JWTAuth(authSvc))
			}

			r.Group(func(r chi.Router) {
				// Admin Routes
				r.Use(authMiddleware.Permission([]aggregate.Role{aggregate.Role_Admin}))

				scheduleHdl.RegisterAdminRoutes(r)
				studentHdl.RegisterAdminRoutes(r)
				userHdl.RegisterAdminRoutes(r)
			})

			authHdl.RegisterAuthenticatedRoutes(r)
			scheduleHdl.RegisterRoutes(r)
			scheduleGenerationHdl.RegisterRoutes(r)
			shiftTemplateHdl.RegisterRoutes(r)
			schedulerConfigHdl.RegisterRoutes(r)
			studentHdl.RegisterRoutes(r)
			userHdl.RegisterRoutes(r)
		})
	})
}

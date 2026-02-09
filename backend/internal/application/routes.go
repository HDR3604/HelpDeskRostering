package application

import (
	"fmt"
	"net/http"

	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
	"github.com/go-chi/chi/v5"
)

func registerRoutes(r *chi.Mux, scheduleHdl *scheduleHandler.ScheduleHandler, scheduleGenerationHdl *scheduleHandler.ScheduleGenerationHandler) {
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	r.Route("/api/v1", func(r chi.Router) {
		scheduleHdl.RegisterRoutes(r)
		scheduleGenerationHdl.RegisterRoutes(r)
	})
}

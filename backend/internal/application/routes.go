package application

import (
	"fmt"
	"net/http"

	scheduleHandler "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/handler"
)

func registerRoutes(mux *http.ServeMux, scheduleHdl *scheduleHandler.ScheduleHandler) {
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		fmt.Fprintln(w, "OK")
	})

	scheduleHdl.RegisterRoutes(mux)
}

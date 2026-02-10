package main

import (
	"log"

	"github.com/HDR3604/HelpDeskApp/internal/application"
)

func main() {
	cfg, err := application.LoadConfig()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	app, err := application.NewApp(cfg)
	if err != nil {
		log.Fatalf("failed to create application: %v", err)
	}
	defer app.Shutdown()

	if err := app.Run(); err != nil {
		log.Fatalf("application error: %v", err)
	}
}

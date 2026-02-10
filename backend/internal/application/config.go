package application

import (
	"fmt"
	"os"
)

type Config struct {
	Port        string
	DatabaseURL string
	Environment string
	DevUserID   string
}

func LoadConfig() (Config, error) {
	cfg := Config{
		Port:        os.Getenv("PORT"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
		Environment: os.Getenv("ENVIRONMENT"),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}

	if cfg.Port == "" {
		cfg.Port = "8080"
	}

	if cfg.Environment == "" {
		cfg.Environment = "development"
	}

	cfg.DevUserID = os.Getenv("DEV_USER_ID")

	return cfg, nil
}

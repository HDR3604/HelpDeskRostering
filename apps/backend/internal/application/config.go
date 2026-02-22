package application

import (
	"fmt"
	"os"
	"strconv"
)

type Config struct {
	Port                 string
	DatabaseURL          string
	Environment          string
	DevUserID            string
	JWTSecret            string
	AccessTokenTTL       int // seconds
	RefreshTokenTTL      int // seconds
	VerificationTokenTTL int // seconds
	FrontendURL          string
	FromEmail            string
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

	// JWT
	cfg.JWTSecret = os.Getenv("JWT_SECRET")
	if cfg.JWTSecret == "" {
		return Config{}, fmt.Errorf("JWT_SECRET environment variable is required")
	}
	if len(cfg.JWTSecret) < 32 {
		return Config{}, fmt.Errorf("JWT_SECRET must be at least 32 characters")
	}

	cfg.AccessTokenTTL = 900 // 15 minutes
	if v := os.Getenv("ACCESS_TOKEN_TTL"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			cfg.AccessTokenTTL = parsed
		}
	}

	cfg.RefreshTokenTTL = 604800 // 7 days
	if v := os.Getenv("REFRESH_TOKEN_TTL"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			cfg.RefreshTokenTTL = parsed
		}
	}

	cfg.VerificationTokenTTL = 86400 // 24 hours
	if v := os.Getenv("VERIFICATION_TOKEN_TTL"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			cfg.VerificationTokenTTL = parsed
		}
	}

	cfg.FrontendURL = os.Getenv("FRONTEND_URL")
	if cfg.FrontendURL == "" {
		cfg.FrontendURL = "http://localhost:5173"
	}

	cfg.FromEmail = os.Getenv("FROM_EMAIL")
	if cfg.FromEmail == "" {
		cfg.FromEmail = "noreply@uwi.edu"
	}

	return cfg, nil
}

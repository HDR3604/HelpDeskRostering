package application

import (
	"encoding/hex"
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
	RateLimitRPM         int // requests per minute per IP
	OnboardingTokenTTL   int // seconds
	FrontendURL          string
	FromEmail            string
	EncryptionKey        string
	SeedAdminFirstName   string
	SeedAdminLastName    string
	SeedAdminEmail       string
	SeedAdminPassword    string
	HelpDeskLongitude    float64
	HelpDeskLatitude     float64
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

	cfg.RateLimitRPM = 30
	if v := os.Getenv("RATE_LIMIT_RPM"); v != "" {
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return Config{}, fmt.Errorf("RATE_LIMIT_RPM must be a valid integer, got %q", v)
		}
		if parsed <= 0 {
			return Config{}, fmt.Errorf("RATE_LIMIT_RPM must be positive, got %d", parsed)
		}
		cfg.RateLimitRPM = parsed
	}

	cfg.OnboardingTokenTTL = 604800 // 7 days
	if v := os.Getenv("ONBOARDING_TOKEN_TTL"); v != "" {
		if parsed, err := strconv.Atoi(v); err == nil {
			cfg.OnboardingTokenTTL = parsed
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

	// Encryption
	cfg.EncryptionKey = os.Getenv("ENCRYPTION_KEY")
	if cfg.EncryptionKey == "" {
		return Config{}, fmt.Errorf("ENCRYPTION_KEY environment variable is required")
	}

	if len(cfg.EncryptionKey) != 64 {
		return Config{}, fmt.Errorf("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)")
	}

	if _, err := hex.DecodeString(cfg.EncryptionKey); err != nil {
		return Config{}, fmt.Errorf("ENCRYPTION_KEY must be valid hex: %w", err)
	}

	cfg.SeedAdminFirstName = os.Getenv("SEED_ADMIN_FIRST_NAME")
	cfg.SeedAdminLastName = os.Getenv("SEED_ADMIN_LAST_NAME")
	cfg.SeedAdminEmail = os.Getenv("SEED_ADMIN_EMAIL")
	cfg.SeedAdminPassword = os.Getenv("SEED_ADMIN_PASSWORD")

	// Help Desk location (defaults to UWI St Augustine campus)
	cfg.HelpDeskLongitude = -61.277001
	if v := os.Getenv("HELPDESK_LONGITUDE"); v != "" {
		parsed, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return Config{}, fmt.Errorf("invalid HELPDESK_LONGITUDE %q: %w", v, err)
		}
		if parsed < -180 || parsed > 180 {
			return Config{}, fmt.Errorf("HELPDESK_LONGITUDE must be in range [-180, 180], got %f", parsed)
		}
		cfg.HelpDeskLongitude = parsed
	}
	cfg.HelpDeskLatitude = 10.642707
	if v := os.Getenv("HELPDESK_LATITUDE"); v != "" {
		parsed, err := strconv.ParseFloat(v, 64)
		if err != nil {
			return Config{}, fmt.Errorf("invalid HELPDESK_LATITUDE %q: %w", v, err)
		}
		if parsed < -90 || parsed > 90 {
			return Config{}, fmt.Errorf("HELPDESK_LATITUDE must be in range [-90, 90], got %f", parsed)
		}
		cfg.HelpDeskLatitude = parsed
	}

	return cfg, nil
}

package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	userErrors "github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"go.uber.org/zap"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	email := os.Getenv("SEED_ADMIN_EMAIL")
	password := os.Getenv("SEED_ADMIN_PASSWORD")
	dbURL := os.Getenv("DATABASE_URL")

	if email == "" || password == "" {
		log.Fatal("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required")
	}
	if dbURL == "" {
		log.Fatal("DATABASE_URL is required")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("failed to open database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	logger, _ := zap.NewProduction()
	defer logger.Sync()

	txManager := database.NewTxManager(db, logger)
	repo := userRepo.NewUserRepository(logger)
	ctx := context.Background()

	err = txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		existing, err := repo.GetByEmail(ctx, tx, email)
		if err == nil && existing != nil {
			fmt.Printf("Admin already exists: %s\n", email)
			return nil
		}
		if err != nil && !errors.Is(err, userErrors.ErrUserNotFound) {
			return err
		}

		hashed, err := bcrypt.GenerateFromPassword([]byte(password), 14)
		if err != nil {
			return err
		}

		now := time.Now()
		user := &aggregate.User{
			ID:              uuid.New(),
			Email:           email,
			Password:        string(hashed),
			Role:            aggregate.Role_Admin,
			IsActive:        true,
			EmailVerifiedAt: &now,
		}

		_, err = repo.Create(ctx, tx, user)
		return err
	})
	if err != nil {
		log.Fatalf("failed to seed admin: %v", err)
	}

	fmt.Printf("Admin user seeded: %s\n", email)
}

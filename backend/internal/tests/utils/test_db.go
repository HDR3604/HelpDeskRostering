package utils

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"runtime"
	"testing"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.uber.org/zap"
)

type TestDB struct {
	DB        *sql.DB
	Logger    *zap.Logger
	ctx       context.Context
	container *postgres.PostgresContainer
}

func NewTestDB(t *testing.T) *TestDB {
	ctx := context.Background()

	// Get migrations path
	_, currentFile, _, _ := runtime.Caller(0)
	migrationsDir := filepath.Join(filepath.Dir(currentFile), "..", "..", "..", "migrations")

	// Start PostgreSQL container with migrations
	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("test"),
		postgres.WithUsername("test"),
		postgres.WithPassword("test"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections.").
				WithOccurrence(2). // Wait for the log message to appear twice (for both primary and standby)
				WithStartupTimeout(60*time.Second),
		),
	)

	if err != nil {
		t.Fatalf("failed to start postgres container: %v", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("failed to get connection string: %v", err)
	}

	// Run migrations
	m, err := migrate.New(
		"file://"+migrationsDir,
		connStr,
	)
	if err != nil {
		t.Fatalf("failed to create migrate instance: %v", err)
	}

	if err := m.Up(); err != nil && err != migrate.ErrNoChange {
		t.Fatalf("failed to run migrations: %v", err)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}

	return &TestDB{
		DB:        db,
		Logger:    zap.NewNop(),
		ctx:       ctx,
		container: pgContainer,
	}
}

func (t *TestDB) Close() {
	if t.DB != nil {
		t.DB.Close()
	}

	if t.container != nil {
		t.container.Terminate(t.ctx)
	}
}

func (t *TestDB) Truncate(tables ...string) {
	for _, table := range tables {
		t.DB.ExecContext(t.ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table))
	}
}

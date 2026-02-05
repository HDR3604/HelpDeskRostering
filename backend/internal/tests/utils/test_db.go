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
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
	_ "github.com/lib/pq"
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

	// Start PostgreSQL container
	pgContainer, err := postgres.Run(ctx,
		"postgres:16-alpine",
		postgres.WithDatabase("helpdesk"),
		postgres.WithUsername("helpdesk"),
		postgres.WithPassword("helpdesk"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(2).
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

	srcErr, dbErr := m.Close()
	if srcErr != nil {
		t.Fatalf("failed to close migration source: %v", srcErr)
	}
	if dbErr != nil {
		t.Fatalf("failed to close migration db: %v", dbErr)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}

	tdb := &TestDB{
		DB:        db,
		Logger:    zap.NewNop(),
		ctx:       ctx,
		container: pgContainer,
	}

	t.Cleanup(func() { tdb.close() })

	return tdb
}

func (tdb *TestDB) close() {
	if tdb.DB != nil {
		tdb.DB.Close()
	}

	if tdb.container != nil {
		if err := tdb.container.Terminate(tdb.ctx); err != nil {
			tdb.Logger.Warn("failed to terminate container", zap.Error(err))
		}
	}
}

func (tdb *TestDB) Truncate(t *testing.T, tables ...string) {
	t.Helper()
	for _, table := range tables {
		if _, err := tdb.DB.ExecContext(tdb.ctx, fmt.Sprintf("TRUNCATE TABLE %s CASCADE", table)); err != nil {
			t.Fatalf("failed to truncate table %s: %v", table, err)
		}
	}
}

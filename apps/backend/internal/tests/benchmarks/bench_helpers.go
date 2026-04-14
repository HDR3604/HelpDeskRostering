package benchmarks

import (
	"context"
	"database/sql"
	"fmt"
	"path/filepath"
	"runtime"
	"sync"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"github.com/pressly/goose/v3"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
	"go.uber.org/zap"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
)

// BenchDB wraps a testcontainers PostgreSQL instance for benchmark tests.
type BenchDB struct {
	DB        *sql.DB
	Logger    *zap.Logger
	TxManager database.TxManagerInterface
	ctx       context.Context
	container *postgres.PostgresContainer
}

var (
	sharedDB   *BenchDB
	sharedOnce sync.Once
	sharedErr  error
)

// SharedBenchDB returns a single shared PostgreSQL container reused across all
// benchmarks in the same test binary. The container is created once (with
// migrations) on the first call and never torn down until the process exits,
// which is handled automatically by testcontainers' reaper.
func SharedBenchDB(b *testing.B) *BenchDB {
	b.Helper()
	sharedOnce.Do(func() {
		sharedDB, sharedErr = newBenchDB()
	})
	if sharedErr != nil {
		b.Fatalf("shared BenchDB: %v", sharedErr)
	}
	return sharedDB
}

// newBenchDB starts a PostgreSQL container and runs all migrations.
func newBenchDB() (*BenchDB, error) {
	ctx := context.Background()

	_, currentFile, _, _ := runtime.Caller(0)
	migrationsDir := filepath.Join(filepath.Dir(currentFile), "..", "..", "..", "..", "..", "migrations")

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
		return nil, fmt.Errorf("failed to start postgres container: %w", err)
	}

	connStr, err := pgContainer.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		return nil, fmt.Errorf("failed to get connection string: %w", err)
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	if err := goose.SetDialect("postgres"); err != nil {
		return nil, fmt.Errorf("failed to set goose dialect: %w", err)
	}
	if err := goose.Up(db, migrationsDir); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	logger := zap.NewNop()
	txManager := database.NewTxManager(db, logger)

	return &BenchDB{
		DB:        db,
		Logger:    logger,
		TxManager: txManager,
		ctx:       ctx,
		container: pgContainer,
	}, nil
}

// NewBenchDB starts a dedicated PostgreSQL container for a single benchmark.
// Prefer SharedBenchDB when multiple benchmarks can share one container.
func NewBenchDB(b *testing.B) *BenchDB {
	b.Helper()
	bdb, err := newBenchDB()
	if err != nil {
		b.Fatal(err)
	}
	b.Cleanup(func() { bdb.close() })
	return bdb
}

func (bdb *BenchDB) close() {
	if bdb.DB != nil {
		_ = bdb.DB.Close()
	}
	if bdb.container != nil {
		_ = bdb.container.Terminate(bdb.ctx)
	}
}

// DeleteAll removes rows from the given tables within an InSystemTx.
// Use this between benchmark iterations to reset state.
func (bdb *BenchDB) DeleteAll(b *testing.B, tables ...string) {
	b.Helper()
	err := bdb.TxManager.InSystemTx(bdb.ctx, func(tx *sql.Tx) error {
		for _, t := range tables {
			if _, err := tx.ExecContext(bdb.ctx, fmt.Sprintf("DELETE FROM %s", t)); err != nil {
				return fmt.Errorf("delete from %s: %w", t, err)
			}
		}
		return nil
	})
	if err != nil {
		b.Fatalf("DeleteAll failed: %v", err)
	}
}

// Ctx returns the background context used by the BenchDB.
func (bdb *BenchDB) Ctx() context.Context {
	return bdb.ctx
}

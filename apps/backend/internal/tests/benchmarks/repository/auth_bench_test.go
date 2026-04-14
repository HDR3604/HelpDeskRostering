package repository_test

import (
	"context"
	"database/sql"
	"testing"
	"time"

	authAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/auth/aggregate"
	userAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	authRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/auth"
	userRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/user"
	"github.com/HDR3604/HelpDeskApp/internal/tests/benchmarks"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// cleanAuthTables removes all rows from auth tables in the correct FK order.
func cleanAuthTables(b *testing.B, bdb *benchmarks.BenchDB) {
	b.Helper()
	bdb.DeleteAll(b,
		"auth.refresh_tokens",
		"auth.auth_tokens",
		"public.email_verifications",
		"auth.students",
		"auth.users",
	)
}

// seedUser creates a verified user in the DB and returns its ID.
func seedUser(b *testing.B, bdb *benchmarks.BenchDB) uuid.UUID {
	b.Helper()
	userID := uuid.New()
	hashed, _ := bcrypt.GenerateFromPassword([]byte("BenchPass1!"), bcrypt.DefaultCost)
	err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		_, err := tx.ExecContext(bdb.Ctx(),
			`INSERT INTO auth.users (user_id, first_name, last_name, email_address, password, role, is_active, email_verified_at)
			 VALUES ($1, 'Bench', 'User', $2, $3, 'admin', true, NOW())`,
			userID, "bench-"+userID.String()[:8]+"@uwi.edu", string(hashed),
		)
		return err
	})
	if err != nil {
		b.Fatalf("seedUser: %v", err)
	}
	return userID
}

// ---------------------------------------------------------------------------
// User Repository Benchmarks
// ---------------------------------------------------------------------------

func BenchmarkUserRepo_Create(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := userRepo.NewUserRepository(bdb.Logger)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		hashed, _ := bcrypt.GenerateFromPassword([]byte("BenchPass1!"), bcrypt.MinCost)
		email := "bench-" + uuid.New().String()[:8] + "@uwi.edu"
		user := &userAggregate.User{
			ID:        uuid.New(),
			FirstName: "Bench",
			LastName:  "User",
			Email:     email,
			Password:  string(hashed),
			Role:      userAggregate.Role_Admin,
			IsActive:  true,
		}
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, user)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

func BenchmarkUserRepo_GetByEmail(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := userRepo.NewUserRepository(bdb.Logger)

	// Seed a user to query
	userID := uuid.New()
	email := "bench-lookup@uwi.edu"
	hashed, _ := bcrypt.GenerateFromPassword([]byte("BenchPass1!"), bcrypt.MinCost)
	err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		_, err := tx.ExecContext(bdb.Ctx(),
			`INSERT INTO auth.users (user_id, first_name, last_name, email_address, password, role, is_active, email_verified_at)
			 VALUES ($1, 'Bench', 'User', $2, $3, 'admin', true, NOW())`,
			userID, email, string(hashed),
		)
		return err
	})
	if err != nil {
		b.Fatalf("seed: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.GetByEmail(bdb.Ctx(), tx, email)
			return err
		})
		if err != nil {
			b.Fatalf("GetByEmail: %v", err)
		}
	}
}

func BenchmarkUserRepo_List(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := userRepo.NewUserRepository(bdb.Logger)

	// Seed 50 users
	hashed, _ := bcrypt.GenerateFromPassword([]byte("BenchPass1!"), bcrypt.MinCost)
	for i := 0; i < 50; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := tx.ExecContext(bdb.Ctx(),
				`INSERT INTO auth.users (user_id, first_name, last_name, email_address, password, role, is_active, email_verified_at)
				 VALUES ($1, 'Bench', 'User', $2, $3, 'admin', true, NOW())`,
				uuid.New(), "bench-"+uuid.New().String()[:8]+"@uwi.edu", string(hashed),
			)
			return err
		})
		if err != nil {
			b.Fatalf("seed: %v", err)
		}
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.List(bdb.Ctx(), tx)
			return err
		})
		if err != nil {
			b.Fatalf("List: %v", err)
		}
	}
}

// ---------------------------------------------------------------------------
// Refresh Token Repository Benchmarks
// ---------------------------------------------------------------------------

func BenchmarkRefreshTokenRepo_Create(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewRefreshTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		token, _, err := authAggregate.NewRefreshToken(userID, 86400)
		if err != nil {
			b.Fatalf("NewRefreshToken: %v", err)
		}
		err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, token)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

func BenchmarkRefreshTokenRepo_GetByTokenHash(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewRefreshTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	// Create a token to look up
	token, _, err := authAggregate.NewRefreshToken(userID, 86400)
	if err != nil {
		b.Fatalf("NewRefreshToken: %v", err)
	}
	err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		_, err := repo.Create(bdb.Ctx(), tx, token)
		return err
	})
	if err != nil {
		b.Fatalf("seed: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.GetByTokenHash(bdb.Ctx(), tx, token.TokenHash)
			return err
		})
		if err != nil {
			b.Fatalf("GetByTokenHash: %v", err)
		}
	}
}

func BenchmarkRefreshTokenRepo_RevokeAllByUserID(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewRefreshTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		// Create 5 tokens per iteration to revoke
		for j := 0; j < 5; j++ {
			token, _, _ := authAggregate.NewRefreshToken(userID, 86400)
			_ = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
				_, err := repo.Create(bdb.Ctx(), tx, token)
				return err
			})
		}
		b.StartTimer()

		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			return repo.RevokeAllByUserID(bdb.Ctx(), tx, userID)
		})
		if err != nil {
			b.Fatalf("RevokeAllByUserID: %v", err)
		}
	}
}

// ---------------------------------------------------------------------------
// Auth Token Repository Benchmarks
// ---------------------------------------------------------------------------

func BenchmarkAuthTokenRepo_Create(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewAuthTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		token, _, err := authAggregate.NewAuthToken(userID, 86400, authAggregate.AuthTokenType_EmailVerification)
		if err != nil {
			b.Fatalf("NewAuthToken: %v", err)
		}
		err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, token)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

func BenchmarkAuthTokenRepo_GetByTokenHash(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewAuthTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	token, _, err := authAggregate.NewAuthToken(userID, 86400, authAggregate.AuthTokenType_EmailVerification)
	if err != nil {
		b.Fatalf("NewAuthToken: %v", err)
	}
	err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		_, err := repo.Create(bdb.Ctx(), tx, token)
		return err
	})
	if err != nil {
		b.Fatalf("seed: %v", err)
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.GetByTokenHash(bdb.Ctx(), tx, token.TokenHash, authAggregate.AuthTokenType_EmailVerification)
			return err
		})
		if err != nil {
			b.Fatalf("GetByTokenHash: %v", err)
		}
	}
}

func BenchmarkAuthTokenRepo_InvalidateAllByUserID(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewAuthTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		for j := 0; j < 5; j++ {
			token, _, _ := authAggregate.NewAuthToken(userID, 86400, authAggregate.AuthTokenType_EmailVerification)
			_ = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
				_, err := repo.Create(bdb.Ctx(), tx, token)
				return err
			})
		}
		b.StartTimer()

		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			return repo.InvalidateAllByUserID(bdb.Ctx(), tx, userID, authAggregate.AuthTokenType_EmailVerification)
		})
		if err != nil {
			b.Fatalf("InvalidateAllByUserID: %v", err)
		}
	}
}

func BenchmarkAuthTokenRepo_DeleteExpired(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanAuthTables(b, bdb)
	repo := authRepo.NewAuthTokenRepository(bdb.Logger)
	userID := seedUser(b, bdb)
	ctx := context.Background()

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		b.StopTimer()
		// Create 10 expired tokens
		for j := 0; j < 10; j++ {
			token, _, _ := authAggregate.NewAuthToken(userID, 1, authAggregate.AuthTokenType_EmailVerification)
			token.ExpiresAt = time.Now().Add(-1 * time.Hour) // already expired
			_ = bdb.TxManager.InSystemTx(ctx, func(tx *sql.Tx) error {
				_, err := repo.Create(ctx, tx, token)
				return err
			})
		}
		b.StartTimer()

		err := bdb.TxManager.InSystemTx(ctx, func(tx *sql.Tx) error {
			_, err := repo.DeleteExpired(ctx, tx, time.Now(), authAggregate.AuthTokenType_EmailVerification)
			return err
		})
		if err != nil {
			b.Fatalf("DeleteExpired: %v", err)
		}
	}
}

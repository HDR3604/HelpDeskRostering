package repository_test

import (
	"database/sql"
	"testing"

	timelogAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogRepository "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	timelogRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/timelog"
	"github.com/HDR3604/HelpDeskApp/internal/tests/benchmarks"
	"github.com/google/uuid"
)

const benchStudentID int32 = 816000001

// seedStudent creates a student record required as FK for time_logs.
func seedStudent(b *testing.B, bdb *benchmarks.BenchDB) {
	b.Helper()
	err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		_, err := tx.ExecContext(bdb.Ctx(),
			`INSERT INTO auth.students (student_id, email_address, first_name, last_name, phone_number, transcript_metadata, availability)
			 VALUES ($1, 'bench.student@my.uwi.edu', 'Bench', 'Student', '1234567890', '{}', '{}')
			 ON CONFLICT DO NOTHING`,
			benchStudentID,
		)
		return err
	})
	if err != nil {
		b.Fatalf("seedStudent: %v", err)
	}
}

func seedTimeLog(b *testing.B, bdb *benchmarks.BenchDB, repo timelogRepository.TimeLogRepositoryInterface) uuid.UUID {
	b.Helper()
	tl, err := timelogAggregate.NewTimeLog(benchStudentID, -61.5, 10.6, 5.0)
	if err != nil {
		b.Fatalf("NewTimeLog: %v", err)
	}
	err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		created, err := repo.Create(bdb.Ctx(), tx, tl)
		if err != nil {
			return err
		}
		tl = created
		return nil
	})
	if err != nil {
		b.Fatalf("seedTimeLog: %v", err)
	}
	return tl.ID
}

// ---------------------------------------------------------------------------
// TimeLog Repository Benchmarks
// ---------------------------------------------------------------------------

// cleanTimeLogTables removes all rows from timelog and auth tables.
func cleanTimeLogTables(b *testing.B, bdb *benchmarks.BenchDB) {
	b.Helper()
	bdb.DeleteAll(b,
		"schedule.time_logs",
		"schedule.schedules",
		"auth.refresh_tokens",
		"auth.auth_tokens",
		"public.email_verifications",
		"auth.students",
		"auth.users",
	)
}

func BenchmarkTimeLogRepo_Create(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanTimeLogTables(b, bdb)
	repo := timelogRepo.NewTimeLogRepository(bdb.Logger)
	seedStudent(b, bdb)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tl, err := timelogAggregate.NewTimeLog(benchStudentID, -61.5, 10.6, 5.0)
		if err != nil {
			b.Fatalf("NewTimeLog: %v", err)
		}
		err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			// Close any existing open log so the unique constraint is satisfied
			_, _ = tx.ExecContext(bdb.Ctx(),
				`UPDATE schedule.time_logs SET exit_at = NOW() WHERE student_id = $1 AND exit_at IS NULL`,
				benchStudentID,
			)
			_, err := repo.Create(bdb.Ctx(), tx, tl)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

func BenchmarkTimeLogRepo_GetByID(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanTimeLogTables(b, bdb)
	repo := timelogRepo.NewTimeLogRepository(bdb.Logger)
	seedStudent(b, bdb)
	logID := seedTimeLog(b, bdb, repo)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.GetByID(bdb.Ctx(), tx, logID)
			return err
		})
		if err != nil {
			b.Fatalf("GetByID: %v", err)
		}
	}
}

func BenchmarkTimeLogRepo_List(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanTimeLogTables(b, bdb)
	repo := timelogRepo.NewTimeLogRepository(bdb.Logger)
	seedStudent(b, bdb)

	// Seed 100 time log entries
	for i := 0; i < 100; i++ {
		tl, _ := timelogAggregate.NewTimeLog(benchStudentID, -61.5, 10.6, float64(i))
		_ = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, tl)
			return err
		})
	}

	filter := timelogRepository.TimeLogFilter{
		Page:    1,
		PerPage: 25,
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, _, err := repo.List(bdb.Ctx(), tx, filter)
			return err
		})
		if err != nil {
			b.Fatalf("List: %v", err)
		}
	}
}

func BenchmarkTimeLogRepo_ListWithStudentDetails(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanTimeLogTables(b, bdb)
	repo := timelogRepo.NewTimeLogRepository(bdb.Logger)
	seedStudent(b, bdb)

	for i := 0; i < 50; i++ {
		tl, _ := timelogAggregate.NewTimeLog(benchStudentID, -61.5, 10.6, float64(i))
		_ = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, tl)
			return err
		})
	}

	filter := timelogRepository.TimeLogFilter{
		Page:    1,
		PerPage: 25,
	}

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, _, err := repo.ListWithStudentDetails(bdb.Ctx(), tx, filter)
			return err
		})
		if err != nil {
			b.Fatalf("ListWithStudentDetails: %v", err)
		}
	}
}

package repository_test

import (
	"database/sql"
	"encoding/json"
	"testing"
	"time"

	scheduleAggregate "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleRepo "github.com/HDR3604/HelpDeskApp/internal/infrastructure/schedule"
	"github.com/HDR3604/HelpDeskApp/internal/tests/benchmarks"
	"github.com/google/uuid"
)

// seedSchedule creates a schedule in the DB and returns its ID.
func seedSchedule(b *testing.B, bdb *benchmarks.BenchDB, createdBy uuid.UUID) uuid.UUID {
	b.Helper()
	schedID := uuid.New()
	assignments := `[{"assistant_id":"a1","shift_id":"s1","day_of_week":0,"start":"09:00:00","end":"12:00:00"}]`

	err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
		_, err := tx.ExecContext(bdb.Ctx(),
			`INSERT INTO schedule.schedules (schedule_id, title, is_active, assignments, availability_metadata, created_by, effective_from)
			 VALUES ($1, $2, false, $3, '{}', $4, NOW())`,
			schedID, "Bench Schedule "+schedID.String()[:8], assignments, createdBy,
		)
		return err
	})
	if err != nil {
		b.Fatalf("seedSchedule: %v", err)
	}
	return schedID
}

// cleanScheduleTables removes all rows from schedule and auth tables.
func cleanScheduleTables(b *testing.B, bdb *benchmarks.BenchDB) {
	b.Helper()
	bdb.DeleteAll(b,
		"schedule.schedules",
		"schedule.shift_templates",
		"auth.refresh_tokens",
		"auth.auth_tokens",
		"public.email_verifications",
		"auth.students",
		"auth.users",
	)
}

func BenchmarkScheduleRepo_Create(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanScheduleTables(b, bdb)
	repo := scheduleRepo.NewScheduleRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sched, err := scheduleAggregate.NewSchedule("Bench Schedule", time.Now(), nil)
		if err != nil {
			b.Fatalf("NewSchedule: %v", err)
		}
		sched.CreatedBy = userID
		err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, sched)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

func BenchmarkScheduleRepo_GetByID(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanScheduleTables(b, bdb)
	repo := scheduleRepo.NewScheduleRepository(bdb.Logger)
	userID := seedUser(b, bdb)
	schedID := seedSchedule(b, bdb, userID)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.GetByID(bdb.Ctx(), tx, schedID)
			return err
		})
		if err != nil {
			b.Fatalf("GetByID: %v", err)
		}
	}
}

func BenchmarkScheduleRepo_List(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanScheduleTables(b, bdb)
	repo := scheduleRepo.NewScheduleRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	// Seed 20 schedules
	for i := 0; i < 20; i++ {
		seedSchedule(b, bdb, userID)
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
// Shift Template Repository Benchmarks
// ---------------------------------------------------------------------------

func BenchmarkShiftTemplateRepo_Create(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanScheduleTables(b, bdb)
	repo := scheduleRepo.NewShiftTemplateRepository(bdb.Logger)

	startTime := time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC)
	endTime := time.Date(0, 1, 1, 12, 0, 0, 0, time.UTC)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		tmpl, err := scheduleAggregate.NewShiftTemplate(
			"Shift "+uuid.New().String()[:8],
			0, startTime, endTime, 2, nil,
			[]scheduleAggregate.CourseDemand{
				{CourseCode: "COMP 1601", TutorsRequired: 2, Weight: 1.0},
			},
		)
		if err != nil {
			b.Fatalf("NewShiftTemplate: %v", err)
		}
		err = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, tmpl)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

func BenchmarkShiftTemplateRepo_List(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanScheduleTables(b, bdb)
	repo := scheduleRepo.NewShiftTemplateRepository(bdb.Logger)

	startTime := time.Date(0, 1, 1, 9, 0, 0, 0, time.UTC)
	endTime := time.Date(0, 1, 1, 12, 0, 0, 0, time.UTC)
	// Seed 15 templates
	for i := 0; i < 15; i++ {
		tmpl, _ := scheduleAggregate.NewShiftTemplate(
			"Shift "+uuid.New().String()[:8],
			int32(i%5), startTime, endTime, 2, nil,
			[]scheduleAggregate.CourseDemand{
				{CourseCode: "COMP 1601", TutorsRequired: 2, Weight: 1.0},
			},
		)
		_ = bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, tmpl)
			return err
		})
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
// Schedule with large assignments JSON
// ---------------------------------------------------------------------------

func BenchmarkScheduleRepo_CreateWithLargeAssignments(b *testing.B) {
	bdb := benchmarks.SharedBenchDB(b)
	cleanScheduleTables(b, bdb)
	repo := scheduleRepo.NewScheduleRepository(bdb.Logger)
	userID := seedUser(b, bdb)

	// Build a large assignments JSON array (50 assignments)
	type assignment struct {
		AssistantID string `json:"assistant_id"`
		ShiftID     string `json:"shift_id"`
		DayOfWeek   int    `json:"day_of_week"`
		Start       string `json:"start"`
		End         string `json:"end"`
	}
	assignments := make([]assignment, 50)
	for i := range assignments {
		assignments[i] = assignment{
			AssistantID: uuid.New().String(),
			ShiftID:     uuid.New().String(),
			DayOfWeek:   i % 5,
			Start:       "09:00:00",
			End:         "12:00:00",
		}
	}
	assignmentsJSON, _ := json.Marshal(assignments)

	b.ReportAllocs()
	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		sched, _ := scheduleAggregate.NewSchedule("Large Schedule", time.Now(), nil)
		sched.CreatedBy = userID
		sched.Assignments = json.RawMessage(assignmentsJSON)

		err := bdb.TxManager.InSystemTx(bdb.Ctx(), func(tx *sql.Tx) error {
			_, err := repo.Create(bdb.Ctx(), tx, sched)
			return err
		})
		if err != nil {
			b.Fatalf("Create: %v", err)
		}
	}
}

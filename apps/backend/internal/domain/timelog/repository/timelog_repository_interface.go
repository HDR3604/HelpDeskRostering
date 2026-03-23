package repository

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	"github.com/google/uuid"
)

type TimeLogFilter struct {
	StudentID *int32
	From      *time.Time
	To        *time.Time
	Flagged   *bool
	Page      int
	PerPage   int
}

type TimeLogRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error)
	GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.TimeLog, error)
	GetOpenByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.TimeLog, error)
	Update(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error)
	List(ctx context.Context, tx *sql.Tx, filter TimeLogFilter) ([]*aggregate.TimeLog, int, error)
	ListWithStudentDetails(ctx context.Context, tx *sql.Tx, filter TimeLogFilter) ([]*aggregate.AdminTimeLog, int, error)
	GetByIDWithStudentDetails(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.AdminTimeLog, error)
}

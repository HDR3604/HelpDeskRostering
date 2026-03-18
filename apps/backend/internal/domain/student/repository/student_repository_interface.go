package repository

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
)

type StudentRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, student *aggregate.Student) (*aggregate.Student, error)
	GetByID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.Student, error)
	GetByIDIncludingDeactivated(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.Student, error)
	GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*aggregate.Student, error)
	Update(ctx context.Context, tx *sql.Tx, student *aggregate.Student) error
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Student, error)
	ListByStatus(ctx context.Context, tx *sql.Tx, status string) ([]*aggregate.Student, error)
	ListByIDs(ctx context.Context, tx *sql.Tx, studentIDs []int32) ([]*aggregate.Student, error)
}

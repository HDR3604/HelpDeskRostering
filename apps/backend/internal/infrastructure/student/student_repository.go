package student

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"go.uber.org/zap"
)

var _ repository.StudentRepositoryInterface = (*StudentRepository)(nil)

type StudentRepository struct {
	logger *zap.Logger
}

func NewStudentRepository(logger *zap.Logger) repository.StudentRepositoryInterface {
	return &StudentRepository{logger: logger}
}

func (r *StudentRepository) Create(ctx context.Context, tx *sql.Tx, student *aggregate.Student) (*aggregate.Student, error) {
	m := student.ToModel()

	stmt := table.Students.INSERT(
		table.Students.StudentID,
		table.Students.EmailAddress,
		table.Students.FirstName,
		table.Students.LastName,
		table.Students.PhoneNumber,
		table.Students.TranscriptMetadata,
		table.Students.Availability,
		table.Students.MinWeeklyHours,
		table.Students.MaxWeeklyHours,
	).VALUES(
		m.StudentID,
		m.EmailAddress,
		m.FirstName,
		m.LastName,
		m.PhoneNumber,
		m.TranscriptMetadata,
		m.Availability,
		m.MinWeeklyHours,
		m.MaxWeeklyHours,
	).RETURNING(table.Students.AllColumns)

	var created model.Students
	if err := stmt.QueryContext(ctx, tx, &created); err != nil {
		r.logger.Error("failed to create student", zap.Error(err))
		return nil, fmt.Errorf("failed to create student: %w", err)
	}

	return r.toDomain(&created)
}

func (r *StudentRepository) GetByID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.Student, error) {
	stmt := table.Students.SELECT(table.Students.AllColumns).
		WHERE(
			table.Students.StudentID.EQ(postgres.Int32(studentID)).
				AND(table.Students.DeletedAt.IS_NULL()),
		)

	var m model.Students
	if err := stmt.QueryContext(ctx, tx, &m); err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, studentErrors.ErrNotFound
		}
		r.logger.Error("failed to get student by ID", zap.Error(err))
		return nil, fmt.Errorf("failed to get student by ID: %w", err)
	}

	return r.toDomain(&m)
}

func (r *StudentRepository) GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*aggregate.Student, error) {
	stmt := table.Students.SELECT(table.Students.AllColumns).
		WHERE(
			table.Students.EmailAddress.EQ(postgres.String(email)).
				AND(table.Students.DeletedAt.IS_NULL()),
		)

	var m model.Students
	if err := stmt.QueryContext(ctx, tx, &m); err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, studentErrors.ErrNotFound
		}
		r.logger.Error("failed to get student by email", zap.Error(err))
		return nil, fmt.Errorf("failed to get student by email: %w", err)
	}

	return r.toDomain(&m)
}

func (r *StudentRepository) Update(ctx context.Context, tx *sql.Tx, student *aggregate.Student) error {
	m := student.ToModel()

	stmt := table.Students.UPDATE(
		table.Students.EmailAddress,
		table.Students.PhoneNumber,
		table.Students.Availability,
		table.Students.UpdatedAt,
		table.Students.DeletedAt,
		table.Students.AcceptedAt,
		table.Students.RejectedAt,
		table.Students.MinWeeklyHours,
		table.Students.MaxWeeklyHours,
	).SET(
		m.EmailAddress,
		m.PhoneNumber,
		m.Availability,
		m.UpdatedAt,
		m.DeletedAt,
		m.AcceptedAt,
		m.RejectedAt,
		m.MinWeeklyHours,
		m.MaxWeeklyHours,
	).WHERE(table.Students.StudentID.EQ(postgres.Int32(student.StudentID)))

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to update student", zap.Error(err))
		return fmt.Errorf("failed to update student: %w", err)
	}
	return nil
}

func (r *StudentRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Student, error) {
	stmt := table.Students.SELECT(table.Students.AllColumns).
		WHERE(table.Students.DeletedAt.IS_NULL()).
		ORDER_BY(table.Students.CreatedAt.DESC())

	var models []model.Students
	if err := stmt.QueryContext(ctx, tx, &models); err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.Student{}, nil
		}
		r.logger.Error("failed to list students", zap.Error(err))
		return nil, fmt.Errorf("failed to list students: %w", err)
	}

	return r.toAggregates(models)
}

func (r *StudentRepository) ListByStatus(ctx context.Context, tx *sql.Tx, status string) ([]*aggregate.Student, error) {
	var condition postgres.BoolExpression

	switch status {
	case "pending":
		condition = table.Students.AcceptedAt.IS_NULL().
			AND(table.Students.RejectedAt.IS_NULL()).
			AND(table.Students.DeletedAt.IS_NULL())
	case "accepted":
		condition = table.Students.AcceptedAt.IS_NOT_NULL().
			AND(table.Students.DeletedAt.IS_NULL())
	case "rejected":
		condition = table.Students.RejectedAt.IS_NOT_NULL().
			AND(table.Students.DeletedAt.IS_NULL())
	default:
		return r.List(ctx, tx)
	}

	stmt := table.Students.SELECT(table.Students.AllColumns).
		WHERE(condition).
		ORDER_BY(table.Students.CreatedAt.DESC())

	var models []model.Students
	if err := stmt.QueryContext(ctx, tx, &models); err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.Student{}, nil
		}
		r.logger.Error("failed to list students by status", zap.String("status", status), zap.Error(err))
		return nil, fmt.Errorf("failed to list students by status: %w", err)
	}

	return r.toAggregates(models)
}

func (r *StudentRepository) toDomain(m *model.Students) (*aggregate.Student, error) {
	s, err := aggregate.StudentFromModel(m)
	if err != nil {
		r.logger.Error("failed to convert student model to aggregate", zap.Error(err))
		return nil, fmt.Errorf("failed to convert student model: %w", err)
	}
	return s, nil
}

func (r *StudentRepository) toAggregates(models []model.Students) ([]*aggregate.Student, error) {
	students := make([]*aggregate.Student, 0, len(models))
	for _, m := range models {
		s, err := r.toDomain(&m)
		if err != nil {
			return nil, err
		}
		students = append(students, s)
	}
	return students, nil
}

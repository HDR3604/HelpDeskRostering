package timelog

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/aggregate"
	timelogErrors "github.com/HDR3604/HelpDeskApp/internal/domain/timelog/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/timelog/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

var _ repository.TimeLogRepositoryInterface = (*TimeLogRepository)(nil)

type TimeLogRepository struct {
	logger *zap.Logger
}

func NewTimeLogRepository(logger *zap.Logger) repository.TimeLogRepositoryInterface {
	return &TimeLogRepository{
		logger: logger,
	}
}

func (r *TimeLogRepository) Create(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error) {
	m := timeLog.ToModel()

	stmt := table.TimeLogs.INSERT(
		table.TimeLogs.ID,
		table.TimeLogs.StudentID,
		table.TimeLogs.EntryAt,
		table.TimeLogs.Longitude,
		table.TimeLogs.Latitude,
		table.TimeLogs.DistanceMeters,
		table.TimeLogs.IsFlagged,
	).MODEL(m).RETURNING(table.TimeLogs.AllColumns)

	var result model.TimeLogs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create time log", zap.Error(err))
		return nil, fmt.Errorf("failed to create time log: %w", err)
	}

	tl := aggregate.TimeLogFromModel(result)
	return &tl, nil
}

func (r *TimeLogRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.TimeLog, error) {
	stmt := table.TimeLogs.
		SELECT(table.TimeLogs.AllColumns).
		WHERE(table.TimeLogs.ID.EQ(postgres.UUID(id)))

	var result model.TimeLogs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, timelogErrors.ErrTimeLogNotFound
		}
		r.logger.Error("failed to get time log by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("failed to get time log by ID: %w", err)
	}

	tl := aggregate.TimeLogFromModel(result)
	return &tl, nil
}

func (r *TimeLogRepository) GetOpenByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*aggregate.TimeLog, error) {
	stmt := table.TimeLogs.
		SELECT(table.TimeLogs.AllColumns).
		WHERE(
			table.TimeLogs.StudentID.EQ(postgres.Int32(studentID)).
				AND(table.TimeLogs.ExitAt.IS_NULL()),
		)

	var result model.TimeLogs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, timelogErrors.ErrTimeLogNotFound
		}
		r.logger.Error("failed to get open time log", zap.Error(err), zap.Int32("student_id", studentID))
		return nil, fmt.Errorf("failed to get open time log: %w", err)
	}

	tl := aggregate.TimeLogFromModel(result)
	return &tl, nil
}

func (r *TimeLogRepository) Update(ctx context.Context, tx *sql.Tx, timeLog *aggregate.TimeLog) (*aggregate.TimeLog, error) {
	m := timeLog.ToModel()

	var exitAt interface{}
	if m.ExitAt != nil {
		exitAt = *m.ExitAt
	}
	var flagReason interface{}
	if m.FlagReason != nil {
		flagReason = *m.FlagReason
	}

	stmt := table.TimeLogs.UPDATE(
		table.TimeLogs.ExitAt,
		table.TimeLogs.IsFlagged,
		table.TimeLogs.FlagReason,
	).SET(
		exitAt,
		m.IsFlagged,
		flagReason,
	).WHERE(
		table.TimeLogs.ID.EQ(postgres.UUID(m.ID)),
	).RETURNING(table.TimeLogs.AllColumns)

	var result model.TimeLogs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, timelogErrors.ErrTimeLogNotFound
		}
		r.logger.Error("failed to update time log", zap.Error(err), zap.String("id", timeLog.ID.String()))
		return nil, fmt.Errorf("failed to update time log: %w", err)
	}

	tl := aggregate.TimeLogFromModel(result)
	return &tl, nil
}

func (r *TimeLogRepository) List(ctx context.Context, tx *sql.Tx, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, int, error) {
	condition := postgres.Bool(true)

	if filter.StudentID != nil {
		condition = condition.AND(table.TimeLogs.StudentID.EQ(postgres.Int32(*filter.StudentID)))
	}
	if filter.From != nil {
		condition = condition.AND(table.TimeLogs.EntryAt.GT_EQ(postgres.TimestampzT(*filter.From)))
	}
	if filter.To != nil {
		condition = condition.AND(table.TimeLogs.EntryAt.LT_EQ(postgres.TimestampzT(*filter.To)))
	}
	if filter.Flagged != nil {
		condition = condition.AND(table.TimeLogs.IsFlagged.EQ(postgres.Bool(*filter.Flagged)))
	}

	// Count total
	countStmt := table.TimeLogs.
		SELECT(postgres.COUNT(table.TimeLogs.ID).AS("count")).
		WHERE(condition)

	var countResult struct{ Count int }
	err := countStmt.QueryContext(ctx, tx, &countResult)
	if err != nil && !errors.Is(err, qrm.ErrNoRows) {
		r.logger.Error("failed to count time logs", zap.Error(err))
		return nil, 0, fmt.Errorf("failed to count time logs: %w", err)
	}

	page := filter.Page
	if page < 1 {
		page = 1
	}
	perPage := filter.PerPage
	if perPage < 1 {
		perPage = 20
	}
	offset := (page - 1) * perPage

	stmt := table.TimeLogs.
		SELECT(table.TimeLogs.AllColumns).
		WHERE(condition).
		ORDER_BY(table.TimeLogs.EntryAt.DESC()).
		LIMIT(int64(perPage)).
		OFFSET(int64(offset))

	var results []model.TimeLogs
	err = stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.TimeLog{}, 0, nil
		}
		r.logger.Error("failed to list time logs", zap.Error(err))
		return nil, 0, fmt.Errorf("failed to list time logs: %w", err)
	}

	return toTimeLogAggregates(results), countResult.Count, nil
}

func (r *TimeLogRepository) ListByStudentID(ctx context.Context, tx *sql.Tx, studentID int32, filter repository.TimeLogFilter) ([]*aggregate.TimeLog, error) {
	condition := table.TimeLogs.StudentID.EQ(postgres.Int32(studentID))

	if filter.From != nil {
		condition = condition.AND(table.TimeLogs.EntryAt.GT_EQ(postgres.TimestampzT(*filter.From)))
	}
	if filter.To != nil {
		condition = condition.AND(table.TimeLogs.EntryAt.LT_EQ(postgres.TimestampzT(*filter.To)))
	}
	if filter.Flagged != nil {
		condition = condition.AND(table.TimeLogs.IsFlagged.EQ(postgres.Bool(*filter.Flagged)))
	}

	stmt := table.TimeLogs.
		SELECT(table.TimeLogs.AllColumns).
		WHERE(condition).
		ORDER_BY(table.TimeLogs.EntryAt.DESC())

	var results []model.TimeLogs
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.TimeLog{}, nil
		}
		r.logger.Error("failed to list time logs by student ID", zap.Error(err), zap.Int32("student_id", studentID))
		return nil, fmt.Errorf("failed to list time logs by student ID: %w", err)
	}

	return toTimeLogAggregates(results), nil
}

func toTimeLogAggregates(models []model.TimeLogs) []*aggregate.TimeLog {
	logs := make([]*aggregate.TimeLog, len(models))
	for i, m := range models {
		tl := aggregate.TimeLogFromModel(m)
		logs[i] = &tl
	}
	return logs
}

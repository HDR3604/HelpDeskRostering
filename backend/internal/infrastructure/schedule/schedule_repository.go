package schedule

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/schedule/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

var _ repository.ScheduleRepositoryInterface = (*ScheduleRepository)(nil)

type ScheduleRepository struct {
	logger *zap.Logger
}

func NewScheduleRepository(logger *zap.Logger) repository.ScheduleRepositoryInterface {
	return &ScheduleRepository{
		logger: logger,
	}
}

func (r *ScheduleRepository) Create(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
	m := schedule.ToModel()

	stmt := table.Schedules.INSERT(
		table.Schedules.ScheduleID,
		table.Schedules.Title,
		table.Schedules.Assignments,
		table.Schedules.AvailabilityMetadata,
		table.Schedules.CreatedBy,
		table.Schedules.EffectiveFrom,
		table.Schedules.EffectiveTo,
		table.Schedules.GenerationID,
		table.Schedules.SchedulerMetadata,
	).MODEL(m).RETURNING(table.Schedules.AllColumns)

	var result model.Schedules
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create schedule", zap.Error(err))
		return nil, fmt.Errorf("failed to create schedule: %w", err)
	}

	s := aggregate.ScheduleFromModel(result)
	return &s, nil
}

func (r *ScheduleRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.Schedule, error) {
	stmt := table.Schedules.
		SELECT(table.Schedules.AllColumns).
		WHERE(table.Schedules.ScheduleID.EQ(postgres.UUID(id)))

	var result model.Schedules
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, scheduleErrors.ErrNotFound
		}
		r.logger.Error("failed to get schedule by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("failed to get schedule by ID: %w", err)
	}

	s := aggregate.ScheduleFromModel(result)
	return &s, nil
}

func (r *ScheduleRepository) GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.Schedule, error) {
	stmt := table.Schedules.
		SELECT(table.Schedules.AllColumns).
		WHERE(
			table.Schedules.IsActive.EQ(postgres.Bool(true)).
				AND(table.Schedules.ArchivedAt.IS_NULL()),
		)

	var result model.Schedules
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, scheduleErrors.ErrNotFound
		}
		r.logger.Error("failed to get active schedule", zap.Error(err))
		return nil, fmt.Errorf("failed to get active schedule: %w", err)
	}

	s := aggregate.ScheduleFromModel(result)
	return &s, nil
}

func (r *ScheduleRepository) ListArchived(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error) {
	stmt := table.Schedules.
		SELECT(table.Schedules.AllColumns).
		WHERE(table.Schedules.ArchivedAt.IS_NOT_NULL()).
		ORDER_BY(table.Schedules.ArchivedAt.DESC())

	var results []model.Schedules
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.Schedule{}, nil
		}
		r.logger.Error("failed to list archived schedules", zap.Error(err))
		return nil, fmt.Errorf("failed to list archived schedules: %w", err)
	}

	return toAggregates(results), nil
}

func (r *ScheduleRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.Schedule, error) {
	stmt := table.Schedules.
		SELECT(table.Schedules.AllColumns).
		WHERE(table.Schedules.ArchivedAt.IS_NULL()).
		ORDER_BY(table.Schedules.CreatedAt.DESC())

	var results []model.Schedules
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.Schedule{}, nil
		}
		r.logger.Error("failed to list schedules", zap.Error(err))
		return nil, fmt.Errorf("failed to list schedules: %w", err)
	}

	return toAggregates(results), nil
}

func (r *ScheduleRepository) Update(ctx context.Context, tx *sql.Tx, schedule *aggregate.Schedule) error {
	m := schedule.ToModel()

	stmt := table.Schedules.UPDATE(
		table.Schedules.Title,
		table.Schedules.IsActive,
		table.Schedules.Assignments,
		table.Schedules.AvailabilityMetadata,
		table.Schedules.ArchivedAt,
		table.Schedules.EffectiveFrom,
		table.Schedules.EffectiveTo,
		table.Schedules.GenerationID,
		table.Schedules.SchedulerMetadata,
	).MODEL(m).WHERE(table.Schedules.ScheduleID.EQ(postgres.UUID(m.ScheduleID)))

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to update schedule", zap.Error(err), zap.String("id", schedule.ScheduleID.String()))
		return fmt.Errorf("failed to update schedule: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return scheduleErrors.ErrNotFound
	}

	return nil
}

func toAggregates(models []model.Schedules) []*aggregate.Schedule {
	schedules := make([]*aggregate.Schedule, len(models))
	for i, m := range models {
		s := aggregate.ScheduleFromModel(m)
		schedules[i] = &s
	}
	return schedules
}

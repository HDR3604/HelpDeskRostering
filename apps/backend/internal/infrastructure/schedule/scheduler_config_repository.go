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

var _ repository.SchedulerConfigRepositoryInterface = (*SchedulerConfigRepository)(nil)

type SchedulerConfigRepository struct {
	logger *zap.Logger
}

func NewSchedulerConfigRepository(logger *zap.Logger) repository.SchedulerConfigRepositoryInterface {
	return &SchedulerConfigRepository{
		logger: logger,
	}
}

func (r *SchedulerConfigRepository) Create(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
	m := c.ToModel()

	stmt := table.SchedulerConfigs.INSERT(
		table.SchedulerConfigs.ID,
		table.SchedulerConfigs.Name,
		table.SchedulerConfigs.CourseShortfallPenalty,
		table.SchedulerConfigs.MinHoursPenalty,
		table.SchedulerConfigs.MaxHoursPenalty,
		table.SchedulerConfigs.UnderstaffedPenalty,
		table.SchedulerConfigs.ExtraHoursPenalty,
		table.SchedulerConfigs.MaxExtraPenalty,
		table.SchedulerConfigs.BaselineHoursTarget,
		table.SchedulerConfigs.SolverTimeLimit,
		table.SchedulerConfigs.SolverGap,
		table.SchedulerConfigs.LogSolverOutput,
		table.SchedulerConfigs.IsDefault,
	).MODEL(m).RETURNING(table.SchedulerConfigs.AllColumns)

	var result model.SchedulerConfigs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create scheduler config", zap.Error(err))
		return nil, fmt.Errorf("failed to create scheduler config: %w", err)
	}

	s := aggregate.SchedulerConfigFromModel(result)
	return &s, nil
}

func (r *SchedulerConfigRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
	stmt := table.SchedulerConfigs.
		SELECT(table.SchedulerConfigs.AllColumns).
		WHERE(table.SchedulerConfigs.ID.EQ(postgres.UUID(id)))

	var result model.SchedulerConfigs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, scheduleErrors.ErrSchedulerConfigNotFound
		}
		r.logger.Error("failed to get scheduler config by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("failed to get scheduler config by ID: %w", err)
	}

	s := aggregate.SchedulerConfigFromModel(result)
	return &s, nil
}

func (r *SchedulerConfigRepository) GetDefault(ctx context.Context, tx *sql.Tx) (*aggregate.SchedulerConfig, error) {
	stmt := table.SchedulerConfigs.
		SELECT(table.SchedulerConfigs.AllColumns).
		WHERE(table.SchedulerConfigs.IsDefault.EQ(postgres.Bool(true)))

	var result model.SchedulerConfigs
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, scheduleErrors.ErrSchedulerConfigNotFound
		}
		r.logger.Error("failed to get default scheduler config", zap.Error(err))
		return nil, fmt.Errorf("failed to get default scheduler config: %w", err)
	}

	s := aggregate.SchedulerConfigFromModel(result)
	return &s, nil
}

func (r *SchedulerConfigRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.SchedulerConfig, error) {
	stmt := table.SchedulerConfigs.
		SELECT(table.SchedulerConfigs.AllColumns).
		ORDER_BY(table.SchedulerConfigs.CreatedAt.DESC())

	var results []model.SchedulerConfigs
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.SchedulerConfig{}, nil
		}
		r.logger.Error("failed to list scheduler configs", zap.Error(err))
		return nil, fmt.Errorf("failed to list scheduler configs: %w", err)
	}

	return toSchedulerConfigAggregates(results), nil
}

func (r *SchedulerConfigRepository) Update(ctx context.Context, tx *sql.Tx, c *aggregate.SchedulerConfig) error {
	m := c.ToModel()

	stmt := table.SchedulerConfigs.UPDATE(
		table.SchedulerConfigs.Name,
		table.SchedulerConfigs.CourseShortfallPenalty,
		table.SchedulerConfigs.MinHoursPenalty,
		table.SchedulerConfigs.MaxHoursPenalty,
		table.SchedulerConfigs.UnderstaffedPenalty,
		table.SchedulerConfigs.ExtraHoursPenalty,
		table.SchedulerConfigs.MaxExtraPenalty,
		table.SchedulerConfigs.BaselineHoursTarget,
		table.SchedulerConfigs.SolverTimeLimit,
		table.SchedulerConfigs.SolverGap,
		table.SchedulerConfigs.LogSolverOutput,
		table.SchedulerConfigs.IsDefault,
	).MODEL(m).WHERE(table.SchedulerConfigs.ID.EQ(postgres.UUID(m.ID)))

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to update scheduler config", zap.Error(err), zap.String("id", c.ID.String()))
		return fmt.Errorf("failed to update scheduler config: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return scheduleErrors.ErrSchedulerConfigNotFound
	}

	return nil
}

func toSchedulerConfigAggregates(models []model.SchedulerConfigs) []*aggregate.SchedulerConfig {
	configs := make([]*aggregate.SchedulerConfig, len(models))
	for i, m := range models {
		s := aggregate.SchedulerConfigFromModel(m)
		configs[i] = &s
	}
	return configs
}

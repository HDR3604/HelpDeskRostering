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

var _ repository.ScheduleGenerationRepositoryInterface = (*ScheduleGenerationRepository)(nil)

type ScheduleGenerationRepository struct {
	logger *zap.Logger
}

func NewScheduleGenerationRepository(logger *zap.Logger) repository.ScheduleGenerationRepositoryInterface {
	return &ScheduleGenerationRepository{
		logger: logger,
	}
}

func (r *ScheduleGenerationRepository) Create(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) (*aggregate.ScheduleGeneration, error) {
	m := generation.ToModel()

	stmt := table.ScheduleGenerations.INSERT(
		table.ScheduleGenerations.ID,
		table.ScheduleGenerations.ConfigID,
		table.ScheduleGenerations.Status,
		table.ScheduleGenerations.RequestPayload,
		table.ScheduleGenerations.CreatedBy,
	).MODEL(m).RETURNING(table.ScheduleGenerations.AllColumns)

	var result model.ScheduleGenerations
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create schedule generation", zap.Error(err))
		return nil, fmt.Errorf("failed to create schedule generation: %w", err)
	}

	g := aggregate.ScheduleGenerationFromModel(result)
	return &g, nil
}

func (r *ScheduleGenerationRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
	stmt := table.ScheduleGenerations.
		SELECT(table.ScheduleGenerations.AllColumns).
		WHERE(table.ScheduleGenerations.ID.EQ(postgres.UUID(id)))

	var result model.ScheduleGenerations
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, scheduleErrors.ErrGenerationNotFound
		}
		r.logger.Error("failed to get schedule generation by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("failed to get schedule generation by ID: %w", err)
	}

	g := aggregate.ScheduleGenerationFromModel(result)
	return &g, nil
}

func (r *ScheduleGenerationRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.ScheduleGeneration, error) {
	stmt := table.ScheduleGenerations.
		SELECT(table.ScheduleGenerations.AllColumns).
		ORDER_BY(table.ScheduleGenerations.CreatedAt.DESC())

	var results []model.ScheduleGenerations
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.ScheduleGeneration{}, nil
		}
		r.logger.Error("failed to list schedule generations", zap.Error(err))
		return nil, fmt.Errorf("failed to list schedule generations: %w", err)
	}

	return toGenerationAggregates(results), nil
}

func (r *ScheduleGenerationRepository) Update(ctx context.Context, tx *sql.Tx, generation *aggregate.ScheduleGeneration) error {
	m := generation.ToModel()

	stmt := table.ScheduleGenerations.UPDATE(
		table.ScheduleGenerations.Status,
		table.ScheduleGenerations.ScheduleID,
		table.ScheduleGenerations.ResponsePayload,
		table.ScheduleGenerations.ErrorMessage,
		table.ScheduleGenerations.StartedAt,
		table.ScheduleGenerations.CompletedAt,
	).MODEL(m).WHERE(table.ScheduleGenerations.ID.EQ(postgres.UUID(m.ID)))

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to update schedule generation", zap.Error(err), zap.String("id", generation.ID.String()))
		return fmt.Errorf("failed to update schedule generation: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return scheduleErrors.ErrGenerationNotFound
	}

	return nil
}

func toGenerationAggregates(models []model.ScheduleGenerations) []*aggregate.ScheduleGeneration {
	generations := make([]*aggregate.ScheduleGeneration, len(models))
	for i, m := range models {
		g := aggregate.ScheduleGenerationFromModel(m)
		generations[i] = &g
	}
	return generations
}

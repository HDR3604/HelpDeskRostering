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

var _ repository.ShiftTemplateRepositoryInterface = (*ShiftTemplateRepository)(nil)

type ShiftTemplateRepository struct {
	logger *zap.Logger
}

func NewShiftTemplateRepository(logger *zap.Logger) repository.ShiftTemplateRepositoryInterface {
	return &ShiftTemplateRepository{
		logger: logger,
	}
}

func (r *ShiftTemplateRepository) Create(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
	m := t.ToModel()

	stmt := table.ShiftTemplates.INSERT(
		table.ShiftTemplates.ID,
		table.ShiftTemplates.Name,
		table.ShiftTemplates.DayOfWeek,
		table.ShiftTemplates.StartTime,
		table.ShiftTemplates.EndTime,
		table.ShiftTemplates.MinStaff,
		table.ShiftTemplates.MaxStaff,
		table.ShiftTemplates.CourseDemands,
		table.ShiftTemplates.IsActive,
	).MODEL(m).RETURNING(table.ShiftTemplates.AllColumns)

	var result model.ShiftTemplates
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create shift template", zap.Error(err))
		return nil, fmt.Errorf("failed to create shift template: %w", err)
	}

	s := aggregate.ShiftTemplateFromModel(result)
	return &s, nil
}

func (r *ShiftTemplateRepository) BulkCreate(ctx context.Context, tx *sql.Tx, templates []*aggregate.ShiftTemplate) ([]*aggregate.ShiftTemplate, error) {
	models := make([]model.ShiftTemplates, len(templates))
	for i, t := range templates {
		models[i] = t.ToModel()
	}

	stmt := table.ShiftTemplates.INSERT(
		table.ShiftTemplates.ID,
		table.ShiftTemplates.Name,
		table.ShiftTemplates.DayOfWeek,
		table.ShiftTemplates.StartTime,
		table.ShiftTemplates.EndTime,
		table.ShiftTemplates.MinStaff,
		table.ShiftTemplates.MaxStaff,
		table.ShiftTemplates.CourseDemands,
		table.ShiftTemplates.IsActive,
	).MODELS(models).RETURNING(table.ShiftTemplates.AllColumns)

	var results []model.ShiftTemplates
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		r.logger.Error("failed to bulk create shift templates", zap.Error(err))
		return nil, fmt.Errorf("failed to bulk create shift templates: %w", err)
	}

	return toShiftTemplateAggregates(results), nil
}

func (r *ShiftTemplateRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
	stmt := table.ShiftTemplates.
		SELECT(table.ShiftTemplates.AllColumns).
		WHERE(table.ShiftTemplates.ID.EQ(postgres.UUID(id)))

	var result model.ShiftTemplates
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, scheduleErrors.ErrShiftTemplateNotFound
		}
		r.logger.Error("failed to get shift template by ID", zap.Error(err), zap.String("id", id.String()))
		return nil, fmt.Errorf("failed to get shift template by ID: %w", err)
	}

	s := aggregate.ShiftTemplateFromModel(result)
	return &s, nil
}

func (r *ShiftTemplateRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
	stmt := table.ShiftTemplates.
		SELECT(table.ShiftTemplates.AllColumns).
		WHERE(table.ShiftTemplates.IsActive.EQ(postgres.Bool(true))).
		ORDER_BY(table.ShiftTemplates.DayOfWeek.ASC(), table.ShiftTemplates.StartTime.ASC())

	var results []model.ShiftTemplates
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.ShiftTemplate{}, nil
		}
		r.logger.Error("failed to list shift templates", zap.Error(err))
		return nil, fmt.Errorf("failed to list shift templates: %w", err)
	}

	return toShiftTemplateAggregates(results), nil
}

func (r *ShiftTemplateRepository) ListAll(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
	stmt := table.ShiftTemplates.
		SELECT(table.ShiftTemplates.AllColumns).
		ORDER_BY(table.ShiftTemplates.DayOfWeek.ASC(), table.ShiftTemplates.StartTime.ASC())

	var results []model.ShiftTemplates
	err := stmt.QueryContext(ctx, tx, &results)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return []*aggregate.ShiftTemplate{}, nil
		}
		r.logger.Error("failed to list all shift templates", zap.Error(err))
		return nil, fmt.Errorf("failed to list all shift templates: %w", err)
	}

	return toShiftTemplateAggregates(results), nil
}

func (r *ShiftTemplateRepository) Update(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) error {
	m := t.ToModel()

	stmt := table.ShiftTemplates.UPDATE(
		table.ShiftTemplates.Name,
		table.ShiftTemplates.DayOfWeek,
		table.ShiftTemplates.StartTime,
		table.ShiftTemplates.EndTime,
		table.ShiftTemplates.MinStaff,
		table.ShiftTemplates.MaxStaff,
		table.ShiftTemplates.CourseDemands,
		table.ShiftTemplates.IsActive,
	).MODEL(m).WHERE(table.ShiftTemplates.ID.EQ(postgres.UUID(m.ID)))

	result, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to update shift template", zap.Error(err), zap.String("id", t.ID.String()))
		return fmt.Errorf("failed to update shift template: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check rows affected: %w", err)
	}
	if rowsAffected == 0 {
		return scheduleErrors.ErrShiftTemplateNotFound
	}

	return nil
}

func toShiftTemplateAggregates(models []model.ShiftTemplates) []*aggregate.ShiftTemplate {
	templates := make([]*aggregate.ShiftTemplate, len(models))
	for i, m := range models {
		s := aggregate.ShiftTemplateFromModel(m)
		templates[i] = &s
	}
	return templates
}

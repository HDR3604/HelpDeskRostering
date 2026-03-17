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
	"go.uber.org/zap"
)

var _ repository.ClockInCodeRepositoryInterface = (*ClockInCodeRepository)(nil)

type ClockInCodeRepository struct {
	logger *zap.Logger
}

func NewClockInCodeRepository(logger *zap.Logger) repository.ClockInCodeRepositoryInterface {
	return &ClockInCodeRepository{
		logger: logger,
	}
}

func (r *ClockInCodeRepository) Create(ctx context.Context, tx *sql.Tx, code *aggregate.ClockInCode) (*aggregate.ClockInCode, error) {
	m := code.ToModel()

	stmt := table.ClockInCodes.INSERT(
		table.ClockInCodes.ID,
		table.ClockInCodes.Code,
		table.ClockInCodes.ExpiresAt,
		table.ClockInCodes.CreatedBy,
	).MODEL(m).RETURNING(table.ClockInCodes.AllColumns)

	var result model.ClockInCodes
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create clock-in code", zap.Error(err))
		return nil, fmt.Errorf("failed to create clock-in code: %w", err)
	}

	c := aggregate.ClockInCodeFromModel(result)
	return &c, nil
}

func (r *ClockInCodeRepository) GetByCode(ctx context.Context, tx *sql.Tx, code string) (*aggregate.ClockInCode, error) {
	stmt := table.ClockInCodes.
		SELECT(table.ClockInCodes.AllColumns).
		WHERE(
			table.ClockInCodes.Code.EQ(postgres.String(code)).
				AND(table.ClockInCodes.ExpiresAt.GT(postgres.TimestampzExp(postgres.CURRENT_TIMESTAMP()))),
		)

	var result model.ClockInCodes
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, timelogErrors.ErrInvalidClockInCode
		}
		r.logger.Error("failed to get clock-in code", zap.Error(err), zap.String("code", code))
		return nil, fmt.Errorf("failed to get clock-in code: %w", err)
	}

	c := aggregate.ClockInCodeFromModel(result)
	return &c, nil
}

func (r *ClockInCodeRepository) GetActive(ctx context.Context, tx *sql.Tx) (*aggregate.ClockInCode, error) {
	stmt := table.ClockInCodes.
		SELECT(table.ClockInCodes.AllColumns).
		WHERE(
			table.ClockInCodes.ExpiresAt.GT(postgres.TimestampzExp(postgres.CURRENT_TIMESTAMP())),
		).
		ORDER_BY(table.ClockInCodes.CreatedAt.DESC()).
		LIMIT(1)

	var result model.ClockInCodes
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, timelogErrors.ErrInvalidClockInCode
		}
		r.logger.Error("failed to get active clock-in code", zap.Error(err))
		return nil, fmt.Errorf("failed to get active clock-in code: %w", err)
	}

	c := aggregate.ClockInCodeFromModel(result)
	return &c, nil
}

func (r *ClockInCodeRepository) DeleteExpired(ctx context.Context, tx *sql.Tx) error {
	stmt := table.ClockInCodes.DELETE().WHERE(
		table.ClockInCodes.ExpiresAt.LT_EQ(postgres.TimestampzExp(postgres.CURRENT_TIMESTAMP())),
	)

	_, err := stmt.ExecContext(ctx, tx)
	if err != nil {
		r.logger.Error("failed to delete expired clock-in codes", zap.Error(err))
		return fmt.Errorf("failed to delete expired clock-in codes: %w", err)
	}

	return nil
}

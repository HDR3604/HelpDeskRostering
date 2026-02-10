package service

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type UpdateSchedulerConfigParams struct {
	Name                  string
	CourseShortfallPenalty float64
	MinHoursPenalty       float64
	MaxHoursPenalty       float64
	UnderstaffedPenalty   float64
	ExtraHoursPenalty     float64
	MaxExtraPenalty       float64
	BaselineHoursTarget   int32
	SolverTimeLimit       *int32
	SolverGap             *float64
	LogSolverOutput       bool
}

type SchedulerConfigServiceInterface interface {
	Create(ctx context.Context, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error)
	GetByID(ctx context.Context, id uuid.UUID) (*aggregate.SchedulerConfig, error)
	GetDefault(ctx context.Context) (*aggregate.SchedulerConfig, error)
	List(ctx context.Context) ([]*aggregate.SchedulerConfig, error)
	Update(ctx context.Context, id uuid.UUID, params UpdateSchedulerConfigParams) (*aggregate.SchedulerConfig, error)
	SetDefault(ctx context.Context, id uuid.UUID) error
}

type SchedulerConfigService struct {
	logger     *zap.Logger
	repository repository.SchedulerConfigRepositoryInterface
	txManager  database.TxManagerInterface
}

func NewSchedulerConfigService(
	logger *zap.Logger,
	repository repository.SchedulerConfigRepositoryInterface,
	txManager database.TxManagerInterface,
) *SchedulerConfigService {
	return &SchedulerConfigService{
		logger:     logger,
		repository: repository,
		txManager:  txManager,
	}
}

func (s *SchedulerConfigService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.AuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, scheduleErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

func (s *SchedulerConfigService) Create(ctx context.Context, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
	s.logger.Info("creating scheduler config", zap.String("name", c.Name))

	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var result *aggregate.SchedulerConfig
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.Create(ctx, tx, c)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to create scheduler config", zap.Error(err))
		return nil, err
	}

	s.logger.Info("scheduler config created", zap.String("id", result.ID.String()))
	return result, nil
}

func (s *SchedulerConfigService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
	s.logger.Debug("getting scheduler config by ID", zap.String("id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.SchedulerConfig
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByID(ctx, tx, id)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get scheduler config", zap.String("id", id.String()), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *SchedulerConfigService) GetDefault(ctx context.Context) (*aggregate.SchedulerConfig, error) {
	s.logger.Debug("getting default scheduler config")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.SchedulerConfig
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetDefault(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get default scheduler config", zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *SchedulerConfigService) List(ctx context.Context) ([]*aggregate.SchedulerConfig, error) {
	s.logger.Debug("listing scheduler configs")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.SchedulerConfig
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.List(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list scheduler configs", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed scheduler configs", zap.Int("count", len(result)))
	return result, nil
}

func (s *SchedulerConfigService) Update(ctx context.Context, id uuid.UUID, params UpdateSchedulerConfigParams) (*aggregate.SchedulerConfig, error) {
	s.logger.Info("updating scheduler config", zap.String("id", id.String()))

	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var result *aggregate.SchedulerConfig
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		c, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}

		if txErr = c.Update(
			params.Name,
			params.CourseShortfallPenalty, params.MinHoursPenalty, params.MaxHoursPenalty,
			params.UnderstaffedPenalty, params.ExtraHoursPenalty, params.MaxExtraPenalty,
			params.BaselineHoursTarget,
			params.SolverTimeLimit, params.SolverGap, params.LogSolverOutput,
		); txErr != nil {
			return txErr
		}

		if txErr = s.repository.Update(ctx, tx, c); txErr != nil {
			return txErr
		}

		result = c
		return nil
	})
	if err != nil {
		s.logger.Error("failed to update scheduler config", zap.String("id", id.String()), zap.Error(err))
		return nil, err
	}

	s.logger.Info("scheduler config updated", zap.String("id", id.String()))
	return result, nil
}

func (s *SchedulerConfigService) SetDefault(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("setting scheduler config as default", zap.String("id", id.String()))

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		// Clear current default (if any)
		current, txErr := s.repository.GetDefault(ctx, tx)
		if txErr == nil {
			current.IsDefault = false
			if txErr = s.repository.Update(ctx, tx, current); txErr != nil {
				return txErr
			}
		} else if txErr != scheduleErrors.ErrSchedulerConfigNotFound {
			return txErr
		}

		// Set new default
		target, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		target.IsDefault = true
		return s.repository.Update(ctx, tx, target)
	})
	if err != nil {
		s.logger.Error("failed to set scheduler config as default", zap.String("id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("scheduler config set as default", zap.String("id", id.String()))
	return nil
}

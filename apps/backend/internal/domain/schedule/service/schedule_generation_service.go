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

type ScheduleGenerationServiceInterface interface {
	// Internal methods (called by Schedule service during orchestration)
	Create(ctx context.Context, configID uuid.UUID, createdBy uuid.UUID, requestPayload string) (*aggregate.ScheduleGeneration, error)
	MarkStarted(ctx context.Context, id uuid.UUID) error
	MarkCompleted(ctx context.Context, id uuid.UUID, scheduleID uuid.UUID, responsePayload string) error
	MarkFailed(ctx context.Context, id uuid.UUID, errorMessage string) error
	MarkInfeasible(ctx context.Context, id uuid.UUID, responsePayload string, errorMessage string) error

	// External methods (exposed via handler for admin audit)
	GetByID(ctx context.Context, id uuid.UUID) (*aggregate.ScheduleGeneration, error)
	List(ctx context.Context) ([]*aggregate.ScheduleGeneration, error)
}

type ScheduleGenerationService struct {
	logger     *zap.Logger
	repository repository.ScheduleGenerationRepositoryInterface
	txManager  database.TxManagerInterface
}

func NewScheduleGenerationService(
	logger *zap.Logger,
	repository repository.ScheduleGenerationRepositoryInterface,
	txManager database.TxManagerInterface,
) *ScheduleGenerationService {
	return &ScheduleGenerationService{
		logger:     logger,
		repository: repository,
		txManager:  txManager,
	}
}

func (s *ScheduleGenerationService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.AuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, scheduleErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

// --- Internal methods (InSystemTx, no auth validation — caller is responsible) ---

func (s *ScheduleGenerationService) Create(ctx context.Context, configID uuid.UUID, createdBy uuid.UUID, requestPayload string) (*aggregate.ScheduleGeneration, error) {
	s.logger.Info("creating schedule generation",
		zap.String("config_id", configID.String()),
		zap.String("created_by", createdBy.String()),
	)

	generation := aggregate.NewScheduleGeneration(configID, createdBy, requestPayload)

	var result *aggregate.ScheduleGeneration
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.Create(ctx, tx, generation)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to create schedule generation", zap.Error(err))
		return nil, err
	}

	s.logger.Info("schedule generation created", zap.String("generation_id", result.ID.String()))
	return result, nil
}

func (s *ScheduleGenerationService) MarkStarted(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("marking schedule generation as started", zap.String("generation_id", id.String()))

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		generation, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		if txErr = generation.MarkStarted(); txErr != nil {
			return txErr
		}
		return s.repository.Update(ctx, tx, generation)
	})
	if err != nil {
		s.logger.Error("failed to mark schedule generation as started", zap.String("generation_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule generation marked as started", zap.String("generation_id", id.String()))
	return nil
}

func (s *ScheduleGenerationService) MarkCompleted(ctx context.Context, id uuid.UUID, scheduleID uuid.UUID, responsePayload string) error {
	s.logger.Info("marking schedule generation as completed", zap.String("generation_id", id.String()))

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		generation, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		if txErr = generation.MarkCompleted(scheduleID, responsePayload); txErr != nil {
			return txErr
		}
		return s.repository.Update(ctx, tx, generation)
	})
	if err != nil {
		s.logger.Error("failed to mark schedule generation as completed", zap.String("generation_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule generation marked as completed", zap.String("generation_id", id.String()))
	return nil
}

func (s *ScheduleGenerationService) MarkFailed(ctx context.Context, id uuid.UUID, errorMessage string) error {
	s.logger.Info("marking schedule generation as failed", zap.String("generation_id", id.String()))

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		generation, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		if txErr = generation.MarkFailed(errorMessage); txErr != nil {
			return txErr
		}
		return s.repository.Update(ctx, tx, generation)
	})
	if err != nil {
		s.logger.Error("failed to mark schedule generation as failed", zap.String("generation_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule generation marked as failed", zap.String("generation_id", id.String()))
	return nil
}

func (s *ScheduleGenerationService) MarkInfeasible(ctx context.Context, id uuid.UUID, responsePayload string, errorMessage string) error {
	s.logger.Info("marking schedule generation as infeasible", zap.String("generation_id", id.String()))

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		generation, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		if txErr = generation.MarkInfeasible(responsePayload, errorMessage); txErr != nil {
			return txErr
		}
		return s.repository.Update(ctx, tx, generation)
	})
	if err != nil {
		s.logger.Error("failed to mark schedule generation as infeasible", zap.String("generation_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule generation marked as infeasible", zap.String("generation_id", id.String()))
	return nil
}

// --- External methods (InAuthTx, validates auth context) ---

func (s *ScheduleGenerationService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.ScheduleGeneration, error) {
	s.logger.Debug("getting schedule generation by ID", zap.String("generation_id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.ScheduleGeneration
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByID(ctx, tx, id)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get schedule generation", zap.String("generation_id", id.String()), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *ScheduleGenerationService) List(ctx context.Context) ([]*aggregate.ScheduleGeneration, error) {
	s.logger.Debug("listing schedule generations")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.ScheduleGeneration
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.List(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list schedule generations", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed schedule generations", zap.Int("count", len(result)))
	return result, nil
}

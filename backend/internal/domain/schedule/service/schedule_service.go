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

type ScheduleServiceInterface interface {
	Create(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error)
	GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error)
	ListArchived(ctx context.Context) ([]*aggregate.Schedule, error)
	List(ctx context.Context) ([]*aggregate.Schedule, error)
	Archive(ctx context.Context, id uuid.UUID) error
	Unarchive(ctx context.Context, id uuid.UUID) error
	Activate(ctx context.Context, id uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
}

type ScheduleService struct {
	logger     *zap.Logger
	repository repository.ScheduleRepositoryInterface
	txManager  database.TxManagerInterface
}

func NewScheduleService(logger *zap.Logger, repository repository.ScheduleRepositoryInterface, txManager database.TxManagerInterface) *ScheduleService {
	return &ScheduleService{
		logger:     logger,
		repository: repository,
		txManager:  txManager,
	}
}

func (s *ScheduleService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.AuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, scheduleErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

func (s *ScheduleService) Create(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
	s.logger.Info("creating schedule", zap.String("title", schedule.Title))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.Schedule
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.Create(ctx, tx, schedule)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to create schedule", zap.Error(err))
		return nil, err
	}

	s.logger.Info("schedule created", zap.String("schedule_id", result.ScheduleID.String()))
	return result, nil
}

func (s *ScheduleService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error) {
	s.logger.Debug("getting schedule by ID", zap.String("schedule_id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.Schedule
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByID(ctx, tx, id)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get schedule", zap.String("schedule_id", id.String()), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *ScheduleService) ListArchived(ctx context.Context) ([]*aggregate.Schedule, error) {
	s.logger.Debug("listing archived schedules")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.Schedule
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.ListArchived(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list archived schedules", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed archived schedules", zap.Int("count", len(result)))
	return result, nil
}

func (s *ScheduleService) List(ctx context.Context) ([]*aggregate.Schedule, error) {
	s.logger.Debug("listing schedules")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.Schedule
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.List(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list schedules", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed schedules", zap.Int("count", len(result)))
	return result, nil
}

func (s *ScheduleService) Archive(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("archiving schedule", zap.String("schedule_id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return err
	}

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		schedule, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		schedule.Archive()
		return s.repository.Update(ctx, tx, schedule)
	})
	if err != nil {
		s.logger.Error("failed to archive schedule", zap.String("schedule_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule archived", zap.String("schedule_id", id.String()))
	return nil
}

func (s *ScheduleService) Unarchive(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("unarchiving schedule", zap.String("schedule_id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return err
	}

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		schedule, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		schedule.Unarchive()
		return s.repository.Update(ctx, tx, schedule)
	})
	if err != nil {
		s.logger.Error("failed to unarchive schedule", zap.String("schedule_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule unarchived", zap.String("schedule_id", id.String()))
	return nil
}

func (s *ScheduleService) Activate(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("activating schedule", zap.String("schedule_id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return err
	}

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		schedule, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		schedule.Activate()
		return s.repository.Update(ctx, tx, schedule)
	})
	if err != nil {
		s.logger.Error("failed to activate schedule", zap.String("schedule_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule activated", zap.String("schedule_id", id.String()))
	return nil
}

func (s *ScheduleService) Deactivate(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("deactivating schedule", zap.String("schedule_id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return err
	}

	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		schedule, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		schedule.Deactivate()
		return s.repository.Update(ctx, tx, schedule)
	})
	if err != nil {
		s.logger.Error("failed to deactivate schedule", zap.String("schedule_id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("schedule deactivated", zap.String("schedule_id", id.String()))
	return nil
}

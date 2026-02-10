package service

import (
	"context"
	"database/sql"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type UpdateShiftTemplateParams struct {
	Name          string
	DayOfWeek     int32
	StartTime     time.Time
	EndTime       time.Time
	MinStaff      int32
	MaxStaff      *int32
	CourseDemands []aggregate.CourseDemand
}

type ShiftTemplateServiceInterface interface {
	Create(ctx context.Context, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error)
	GetByID(ctx context.Context, id uuid.UUID) (*aggregate.ShiftTemplate, error)
	List(ctx context.Context) ([]*aggregate.ShiftTemplate, error)
	ListAll(ctx context.Context) ([]*aggregate.ShiftTemplate, error)
	Update(ctx context.Context, id uuid.UUID, params UpdateShiftTemplateParams) (*aggregate.ShiftTemplate, error)
	Activate(ctx context.Context, id uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
}

type ShiftTemplateService struct {
	logger     *zap.Logger
	repository repository.ShiftTemplateRepositoryInterface
	txManager  database.TxManagerInterface
}

func NewShiftTemplateService(
	logger *zap.Logger,
	repository repository.ShiftTemplateRepositoryInterface,
	txManager database.TxManagerInterface,
) *ShiftTemplateService {
	return &ShiftTemplateService{
		logger:     logger,
		repository: repository,
		txManager:  txManager,
	}
}

func (s *ShiftTemplateService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.AuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, scheduleErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

func (s *ShiftTemplateService) Create(ctx context.Context, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
	s.logger.Info("creating shift template", zap.String("name", t.Name))

	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var result *aggregate.ShiftTemplate
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.Create(ctx, tx, t)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to create shift template", zap.Error(err))
		return nil, err
	}

	s.logger.Info("shift template created", zap.String("id", result.ID.String()))
	return result, nil
}

func (s *ShiftTemplateService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
	s.logger.Debug("getting shift template by ID", zap.String("id", id.String()))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.ShiftTemplate
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByID(ctx, tx, id)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get shift template", zap.String("id", id.String()), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *ShiftTemplateService) List(ctx context.Context) ([]*aggregate.ShiftTemplate, error) {
	s.logger.Debug("listing active shift templates")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.ShiftTemplate
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.List(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list shift templates", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed shift templates", zap.Int("count", len(result)))
	return result, nil
}

func (s *ShiftTemplateService) ListAll(ctx context.Context) ([]*aggregate.ShiftTemplate, error) {
	s.logger.Debug("listing all shift templates")

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.ShiftTemplate
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.ListAll(ctx, tx)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list all shift templates", zap.Error(err))
		return nil, err
	}

	s.logger.Debug("listed all shift templates", zap.Int("count", len(result)))
	return result, nil
}

func (s *ShiftTemplateService) Update(ctx context.Context, id uuid.UUID, params UpdateShiftTemplateParams) (*aggregate.ShiftTemplate, error) {
	s.logger.Info("updating shift template", zap.String("id", id.String()))

	if _, err := s.authCtx(ctx); err != nil {
		return nil, err
	}

	var result *aggregate.ShiftTemplate
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		t, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}

		if txErr = t.Update(params.Name, params.DayOfWeek, params.StartTime, params.EndTime, params.MinStaff, params.MaxStaff, params.CourseDemands); txErr != nil {
			return txErr
		}

		if txErr = s.repository.Update(ctx, tx, t); txErr != nil {
			return txErr
		}

		result = t
		return nil
	})
	if err != nil {
		s.logger.Error("failed to update shift template", zap.String("id", id.String()), zap.Error(err))
		return nil, err
	}

	s.logger.Info("shift template updated", zap.String("id", id.String()))
	return result, nil
}

func (s *ShiftTemplateService) Activate(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("activating shift template", zap.String("id", id.String()))

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		t, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		t.Activate()
		return s.repository.Update(ctx, tx, t)
	})
	if err != nil {
		s.logger.Error("failed to activate shift template", zap.String("id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("shift template activated", zap.String("id", id.String()))
	return nil
}

func (s *ShiftTemplateService) Deactivate(ctx context.Context, id uuid.UUID) error {
	s.logger.Info("deactivating shift template", zap.String("id", id.String()))

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		t, txErr := s.repository.GetByID(ctx, tx, id)
		if txErr != nil {
			return txErr
		}
		t.Deactivate()
		return s.repository.Update(ctx, tx, t)
	})
	if err != nil {
		s.logger.Error("failed to deactivate shift template", zap.String("id", id.String()), zap.Error(err))
		return err
	}

	s.logger.Info("shift template deactivated", zap.String("id", id.String()))
	return nil
}

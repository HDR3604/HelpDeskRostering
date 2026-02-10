package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

// GenerateScheduleParams holds the parameters for schedule generation.
type GenerateScheduleParams struct {
	ConfigID      uuid.UUID
	Title         string
	EffectiveFrom time.Time
	EffectiveTo   *time.Time
	Assistants    []types.Assistant
}

type ScheduleServiceInterface interface {
	Create(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error)
	GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error)
	ListArchived(ctx context.Context) ([]*aggregate.Schedule, error)
	List(ctx context.Context) ([]*aggregate.Schedule, error)
	Archive(ctx context.Context, id uuid.UUID) error
	Unarchive(ctx context.Context, id uuid.UUID) error
	Activate(ctx context.Context, id uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
	GenerateSchedule(ctx context.Context, params GenerateScheduleParams) (*aggregate.Schedule, error)
}

type ScheduleService struct {
	logger             *zap.Logger
	repository         repository.ScheduleRepositoryInterface
	txManager          database.TxManagerInterface
	generationSvc      ScheduleGenerationServiceInterface
	schedulerSvc       interfaces.SchedulerServiceInterface
	shiftTemplateSvc   ShiftTemplateServiceInterface
	schedulerConfigSvc SchedulerConfigServiceInterface
}

func NewScheduleService(
	logger *zap.Logger,
	repository repository.ScheduleRepositoryInterface,
	txManager database.TxManagerInterface,
	generationSvc ScheduleGenerationServiceInterface,
	schedulerSvc interfaces.SchedulerServiceInterface,
	shiftTemplateSvc ShiftTemplateServiceInterface,
	schedulerConfigSvc SchedulerConfigServiceInterface,
) *ScheduleService {
	return &ScheduleService{
		logger:             logger,
		repository:         repository,
		txManager:          txManager,
		generationSvc:      generationSvc,
		schedulerSvc:       schedulerSvc,
		shiftTemplateSvc:   shiftTemplateSvc,
		schedulerConfigSvc: schedulerConfigSvc,
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

	userID, err := uuid.Parse(authCtx.UserID)
	if err != nil {
		s.logger.Error("invalid user ID in auth context", zap.String("user_id", authCtx.UserID), zap.Error(err))
		return nil, scheduleErrors.ErrMissingAuthContext
	}
	schedule.CreatedBy = userID

	var result *aggregate.Schedule
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
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

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
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

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
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

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
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

	if _, err := s.authCtx(ctx); err != nil {
		return err
	}

	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
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

func (s *ScheduleService) GenerateSchedule(ctx context.Context, params GenerateScheduleParams) (*aggregate.Schedule, error) {
	s.logger.Info("generating schedule",
		zap.String("title", params.Title),
		zap.String("config_id", params.ConfigID.String()),
	)

	// Validate auth context
	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	userID, err := uuid.Parse(authCtx.UserID)
	if err != nil {
		s.logger.Error("invalid user ID in auth context", zap.String("user_id", authCtx.UserID), zap.Error(err))
		return nil, scheduleErrors.ErrMissingAuthContext
	}

	// Validate schedule params before creating generation record
	schedule, err := aggregate.NewSchedule(params.Title, params.EffectiveFrom, params.EffectiveTo)
	if err != nil {
		return nil, err
	}
	schedule.CreatedBy = userID

	// Fetch active shift templates from DB
	shiftTemplates, err := s.shiftTemplateSvc.List(ctx)
	if err != nil {
		s.logger.Error("failed to fetch shift templates", zap.Error(err))
		return nil, err
	}
	if len(shiftTemplates) == 0 {
		return nil, scheduleErrors.ErrNoActiveShiftTemplates
	}

	// Fetch scheduler config from DB
	schedulerConfig, err := s.schedulerConfigSvc.GetByID(ctx, params.ConfigID)
	if err != nil {
		s.logger.Error("failed to fetch scheduler config", zap.String("config_id", params.ConfigID.String()), zap.Error(err))
		return nil, err
	}

	// Build scheduler request from DB data + client-provided assistants
	schedulerRequest := types.GenerateScheduleRequest{
		Assistants:      params.Assistants,
		Shifts:          shiftTemplatesToSchedulerShifts(shiftTemplates),
		SchedulerConfig: schedulerConfigToSchedulerConfig(schedulerConfig),
	}

	// Marshal request payload for audit
	requestPayload, err := json.Marshal(schedulerRequest)
	if err != nil {
		s.logger.Error("failed to marshal request payload", zap.Error(err))
		return nil, err
	}

	// Create generation record and mark started
	generation, err := s.generationSvc.Create(ctx, params.ConfigID, userID, string(requestPayload))
	if err != nil {
		return nil, err
	}

	if err := s.generationSvc.MarkStarted(ctx, generation.ID); err != nil {
		s.logger.Error("failed to mark generation as started, generation left in pending state",
			zap.String("generation_id", generation.ID.String()),
			zap.Error(err),
		)
		return nil, err
	}

	// Ensure generation is resolved on any failure after MarkStarted.
	// On success path, genErr stays nil and the defer is a no-op.
	var genErr error
	var infeasiblePayload string
	defer func() {
		if genErr == nil {
			return
		}
		if errors.Is(genErr, schedulerErrors.ErrInfeasible) {
			if markErr := s.generationSvc.MarkInfeasible(ctx, generation.ID, infeasiblePayload, genErr.Error()); markErr != nil {
				s.logger.Error("failed to mark generation as infeasible",
					zap.String("generation_id", generation.ID.String()),
					zap.Error(markErr),
				)
			}
		} else {
			if markErr := s.generationSvc.MarkFailed(ctx, generation.ID, genErr.Error()); markErr != nil {
				s.logger.Error("failed to mark generation as failed",
					zap.String("generation_id", generation.ID.String()),
					zap.Error(markErr),
				)
			}
		}
	}()

	// Call Python scheduler
	response, err := s.schedulerSvc.GenerateSchedule(schedulerRequest)
	if err != nil {
		genErr = err
		s.logger.Error("scheduler failed", zap.String("generation_id", generation.ID.String()), zap.Error(err))
		return nil, err
	}

	// Marshal response for audit trail
	responsePayload, err := json.Marshal(response)
	if err != nil {
		genErr = err
		s.logger.Error("failed to marshal response payload", zap.Error(err))
		return nil, err
	}

	// Check for infeasible result
	if response.Status == types.ScheduleStatus_Infeasible {
		infeasiblePayload = string(responsePayload)
		genErr = fmt.Errorf("%w: solver returned status %s", schedulerErrors.ErrInfeasible, response.Status)
		return nil, genErr
	}

	assignmentsBytes, err := json.Marshal(response.Assignments)
	if err != nil {
		genErr = err
		s.logger.Error("failed to marshal assignments", zap.Error(err))
		return nil, err
	}

	metadataBytes, err := json.Marshal(response.Metadata)
	if err != nil {
		genErr = err
		s.logger.Error("failed to marshal scheduler metadata", zap.Error(err))
		return nil, err
	}
	schedulerMetadata := string(metadataBytes)

	// Populate schedule with generation results
	schedule.Assignments = assignmentsBytes
	schedule.GenerationID = &generation.ID
	schedule.SchedulerMetadata = &schedulerMetadata

	var result *aggregate.Schedule
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.Create(ctx, tx, schedule)
		return txErr
	})
	if err != nil {
		genErr = err
		s.logger.Error("failed to create schedule from generation", zap.Error(err))
		return nil, err
	}

	// Mark generation completed — genErr stays nil so defer won't fire
	if err := s.generationSvc.MarkCompleted(ctx, generation.ID, result.ScheduleID, string(responsePayload)); err != nil {
		s.logger.Error("failed to mark generation as completed",
			zap.String("generation_id", generation.ID.String()),
			zap.String("schedule_id", result.ScheduleID.String()),
			zap.Error(err),
		)
	}

	s.logger.Info("schedule generated",
		zap.String("schedule_id", result.ScheduleID.String()),
		zap.String("generation_id", generation.ID.String()),
	)

	return result, nil
}

func shiftTemplatesToSchedulerShifts(templates []*aggregate.ShiftTemplate) []types.Shift {
	shifts := make([]types.Shift, len(templates))
	for i, t := range templates {
		demands := make([]types.CourseDemand, len(t.CourseDemands))
		for j, d := range t.CourseDemands {
			demands[j] = types.CourseDemand{
				CourseCode:     d.CourseCode,
				TutorsRequired: d.TutorsRequired,
				Weight:         float32(d.Weight),
			}
		}

		var maxStaff *int
		if t.MaxStaff != nil {
			v := int(*t.MaxStaff)
			maxStaff = &v
		}

		shifts[i] = types.Shift{
			ID:            t.ID.String(),
			DayOfWeek:     int(t.DayOfWeek),
			Start:         t.StartTime.Format("15:04:05"),
			End:           t.EndTime.Format("15:04:05"),
			CourseDemands: demands,
			MinStaff:      int(t.MinStaff),
			MaxStaff:      maxStaff,
			Metadata:      map[string]string{"name": t.Name},
		}
	}
	return shifts
}

func schedulerConfigToSchedulerConfig(config *aggregate.SchedulerConfig) *types.SchedulerConfig {
	var solverGap *float32
	if config.SolverGap != nil {
		v := float32(*config.SolverGap)
		solverGap = &v
	}

	return &types.SchedulerConfig{
		CourseShortfallPenalty: float32(config.CourseShortfallPenalty),
		MinHoursPenalty:       float32(config.MinHoursPenalty),
		MaxHoursPenalty:       float32(config.MaxHoursPenalty),
		UnderstaffedPenalty:   float32(config.UnderstaffedPenalty),
		ExtraHoursPenalty:     float32(config.ExtraHoursPenalty),
		MaxExtraPenalty:       float32(config.MaxExtraPenalty),
		BaselineHoursTarget:   config.BaselineHoursTarget,
		SolverTimeLimit:       config.SolverTimeLimit,
		SolverGap:             solverGap,
		LogSolverOutput:       config.LogSolverOutput,
	}
}

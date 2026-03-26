package jobs

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	schedulerErrors "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/errors"
	schedulerInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/interfaces"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/scheduler/types"
	"github.com/google/uuid"
	"github.com/riverqueue/river"
	"go.uber.org/zap"
)

// ScheduleGenerationArgs are the arguments for a schedule generation job.
type ScheduleGenerationArgs struct {
	GenerationID   uuid.UUID                     `json:"generation_id"`
	Title          string                        `json:"title"`
	EffectiveFrom  string                        `json:"effective_from"`
	EffectiveTo    *string                       `json:"effective_to,omitempty"`
	CreatedBy      uuid.UUID                     `json:"created_by"`
	RequestPayload types.GenerateScheduleRequest `json:"request_payload"`
}

func (ScheduleGenerationArgs) Kind() string { return "schedule_generation" }

func (ScheduleGenerationArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{
		Queue:       "schedule_generation",
		MaxAttempts: 3,
	}
}

// ScheduleGenerationWorker processes schedule generation jobs by calling the Python scheduler.
type ScheduleGenerationWorker struct {
	river.WorkerDefaults[ScheduleGenerationArgs]
	logger         *zap.Logger
	generationSvc  service.ScheduleGenerationServiceInterface
	generationRepo repository.ScheduleGenerationRepositoryInterface
	schedulerSvc   schedulerInterfaces.SchedulerServiceInterface
	scheduleRepo   repository.ScheduleRepositoryInterface
	txManager      database.TxManagerInterface
}

func NewScheduleGenerationWorker(
	logger *zap.Logger,
	generationSvc service.ScheduleGenerationServiceInterface,
	generationRepo repository.ScheduleGenerationRepositoryInterface,
	schedulerSvc schedulerInterfaces.SchedulerServiceInterface,
	scheduleRepo repository.ScheduleRepositoryInterface,
	txManager database.TxManagerInterface,
) *ScheduleGenerationWorker {
	return &ScheduleGenerationWorker{
		logger:         logger.Named("schedule_generation_worker"),
		generationSvc:  generationSvc,
		generationRepo: generationRepo,
		schedulerSvc:   schedulerSvc,
		scheduleRepo:   scheduleRepo,
		txManager:      txManager,
	}
}

func (w *ScheduleGenerationWorker) Work(ctx context.Context, job *river.Job[ScheduleGenerationArgs]) error {
	args := job.Args
	log := w.logger.With(zap.String("generation_id", args.GenerationID.String()))

	log.Info("starting schedule generation")

	// Mark generation as started (ignore error on retries — already started)
	if err := w.generationSvc.MarkStarted(ctx, args.GenerationID); err != nil {
		log.Warn("failed to mark generation as started (may already be started on retry)", zap.Error(err))
	}

	// Call the Python scheduler (the slow part)
	response, err := w.schedulerSvc.GenerateSchedule(args.RequestPayload)
	if err != nil {
		log.Error("scheduler failed", zap.Error(err))

		if errors.Is(err, schedulerErrors.ErrSchedulerUnavailable) {
			// Transient error — let River retry, unless this is the last attempt
			if job.Attempt >= job.MaxAttempts {
				w.markFailed(ctx, args.GenerationID, fmt.Sprintf("scheduler unavailable after %d attempts: %v", job.Attempt, err))
				return nil
			}
			return err
		}

		w.markFailed(ctx, args.GenerationID, err.Error())
		return nil
	}

	// Marshal response for audit trail
	responsePayload, err := json.Marshal(response)
	if err != nil {
		log.Error("failed to marshal response payload", zap.Error(err))
		w.markFailed(ctx, args.GenerationID, fmt.Sprintf("failed to marshal response: %v", err))
		return nil
	}

	// Check for infeasible result
	if response.Status == types.ScheduleStatus_Infeasible {
		w.markInfeasible(ctx, args.GenerationID, string(responsePayload),
			fmt.Sprintf("solver returned status %s", response.Status))
		return nil
	}

	assignmentsBytes, err := json.Marshal(response.Assignments)
	if err != nil {
		log.Error("failed to marshal assignments", zap.Error(err))
		w.markFailed(ctx, args.GenerationID, fmt.Sprintf("failed to marshal assignments: %v", err))
		return nil
	}

	metadataBytes, err := json.Marshal(response.Metadata)
	if err != nil {
		log.Error("failed to marshal metadata", zap.Error(err))
		w.markFailed(ctx, args.GenerationID, fmt.Sprintf("failed to marshal metadata: %v", err))
		return nil
	}
	schedulerMetadata := string(metadataBytes)

	// Parse dates for schedule creation
	effectiveFrom, err := time.Parse("2006-01-02", args.EffectiveFrom)
	if err != nil {
		w.markFailed(ctx, args.GenerationID, fmt.Sprintf("invalid effective_from: %v", err))
		return nil
	}
	var effectiveTo *time.Time
	if args.EffectiveTo != nil {
		t, err := time.Parse("2006-01-02", *args.EffectiveTo)
		if err != nil {
			w.markFailed(ctx, args.GenerationID, fmt.Sprintf("invalid effective_to: %v", err))
			return nil
		}
		effectiveTo = &t
	}

	// Build and persist the schedule
	schedule, err := aggregate.NewSchedule(args.Title, effectiveFrom, effectiveTo)
	if err != nil {
		w.markFailed(ctx, args.GenerationID, fmt.Sprintf("invalid schedule params: %v", err))
		return nil
	}
	schedule.CreatedBy = args.CreatedBy
	schedule.Assignments = assignmentsBytes
	schedule.GenerationID = &args.GenerationID
	schedule.SchedulerMetadata = &schedulerMetadata

	// Create the schedule and mark generation completed in a single transaction
	// to prevent partial success (schedule exists but generation stuck pending).
	var result *aggregate.Schedule
	err = w.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = w.scheduleRepo.Create(ctx, tx, schedule)
		if txErr != nil {
			return txErr
		}

		generation, txErr := w.generationRepo.GetByID(ctx, tx, args.GenerationID)
		if txErr != nil {
			return txErr
		}
		if txErr = generation.MarkCompleted(result.ScheduleID, string(responsePayload)); txErr != nil {
			return txErr
		}
		return w.generationRepo.Update(ctx, tx, generation)
	})
	if err != nil {
		log.Error("failed to create schedule and complete generation", zap.Error(err))
		w.markFailed(ctx, args.GenerationID, fmt.Sprintf("failed to create schedule: %v", err))
		return nil
	}

	log.Info("schedule generated successfully",
		zap.String("schedule_id", result.ScheduleID.String()),
	)

	return nil
}

func (w *ScheduleGenerationWorker) markFailed(ctx context.Context, generationID uuid.UUID, msg string) {
	if err := w.generationSvc.MarkFailed(ctx, generationID, msg); err != nil {
		w.logger.Error("failed to mark generation as failed",
			zap.String("generation_id", generationID.String()),
			zap.Error(err),
		)
	}
}

func (w *ScheduleGenerationWorker) markInfeasible(ctx context.Context, generationID uuid.UUID, responsePayload, msg string) {
	if err := w.generationSvc.MarkInfeasible(ctx, generationID, responsePayload, msg); err != nil {
		w.logger.Error("failed to mark generation as infeasible",
			zap.String("generation_id", generationID.String()),
			zap.Error(err),
		)
	}
}

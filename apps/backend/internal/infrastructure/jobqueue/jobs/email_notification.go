package jobs

import (
	"context"
	"fmt"

	emailInterfaces "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/interfaces"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/google/uuid"
	"github.com/riverqueue/river"
	"go.uber.org/zap"
)

// EmailNotificationArgs are the arguments for an email notification job.
// The email batch is pre-built by the handler and passed directly.
// Each job contains a single batch of up to 100 emails to avoid
// duplicate sends on retry.
type EmailNotificationArgs struct {
	ScheduleID uuid.UUID                      `json:"schedule_id"`
	Emails     emailDtos.SendEmailBulkRequest `json:"emails"`
	BatchIndex int                            `json:"batch_index"`
}

func (EmailNotificationArgs) Kind() string { return "email_notification" }

func (EmailNotificationArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{
		Queue:       "email_notification",
		MaxAttempts: 5,
	}
}

// EmailNotificationWorker sends a single batch of roster notification emails.
type EmailNotificationWorker struct {
	river.WorkerDefaults[EmailNotificationArgs]
	logger      *zap.Logger
	emailSender emailInterfaces.EmailSenderInterface
}

func NewEmailNotificationWorker(
	logger *zap.Logger,
	emailSender emailInterfaces.EmailSenderInterface,
) *EmailNotificationWorker {
	return &EmailNotificationWorker{
		logger:      logger.Named("email_notification_worker"),
		emailSender: emailSender,
	}
}

func (w *EmailNotificationWorker) Work(ctx context.Context, job *river.Job[EmailNotificationArgs]) error {
	args := job.Args
	log := w.logger.With(
		zap.String("schedule_id", args.ScheduleID.String()),
		zap.Int("batch_index", args.BatchIndex),
	)

	log.Info("sending roster notification emails", zap.Int("count", len(args.Emails)))

	if _, err := w.emailSender.SendBatch(ctx, args.Emails); err != nil {
		log.Error("failed to send email batch", zap.Error(err))
		return fmt.Errorf("failed to send email batch %d: %w", args.BatchIndex, err)
	}

	log.Info("roster notification emails sent successfully",
		zap.Int("count", len(args.Emails)),
	)

	return nil
}

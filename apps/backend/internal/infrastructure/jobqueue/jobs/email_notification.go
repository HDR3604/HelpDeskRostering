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
type EmailNotificationArgs struct {
	ScheduleID uuid.UUID                      `json:"schedule_id"`
	Emails     emailDtos.SendEmailBulkRequest `json:"emails"`
}

func (EmailNotificationArgs) Kind() string { return "email_notification" }

func (EmailNotificationArgs) InsertOpts() river.InsertOpts {
	return river.InsertOpts{
		Queue:       "email_notification",
		MaxAttempts: 5,
	}
}

// EmailNotificationWorker sends roster notification emails in batches.
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
	log := w.logger.With(zap.String("schedule_id", args.ScheduleID.String()))

	log.Info("sending roster notification emails", zap.Int("count", len(args.Emails)))

	// Send in batches of 100
	for i := 0; i < len(args.Emails); i += 100 {
		end := i + 100
		if end > len(args.Emails) {
			end = len(args.Emails)
		}
		batch := args.Emails[i:end]
		if _, err := w.emailSender.SendBatch(ctx, batch); err != nil {
			log.Error("failed to send email batch",
				zap.Int("batch_start", i),
				zap.Error(err),
			)
			return fmt.Errorf("failed to send email batch starting at %d: %w", i, err)
		}
	}

	log.Info("roster notification emails sent successfully",
		zap.Int("count", len(args.Emails)),
	)

	return nil
}

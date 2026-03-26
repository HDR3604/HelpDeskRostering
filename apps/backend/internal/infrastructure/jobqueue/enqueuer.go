package jobqueue

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	emailDtos "github.com/HDR3604/HelpDeskApp/internal/infrastructure/email/types/dtos"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/jobqueue/jobs"
	"github.com/google/uuid"
	"github.com/riverqueue/river"
)

// Verify Enqueuer implements ScheduleJobEnqueuer at compile time.
var _ service.ScheduleJobEnqueuer = (*Enqueuer)(nil)

// Enqueuer provides methods to enqueue jobs. It wraps the River client
// and exposes domain-friendly methods.
type Enqueuer struct {
	client *river.Client[*sql.Tx]
}

func NewEnqueuer(client *Client) *Enqueuer {
	return &Enqueuer{client: client.River()}
}

func (e *Enqueuer) EnqueueScheduleGeneration(ctx context.Context, args service.ScheduleGenerationJobArgs) error {
	_, err := e.client.Insert(ctx, jobs.ScheduleGenerationArgs{
		GenerationID:   args.GenerationID,
		Title:          args.Title,
		EffectiveFrom:  args.EffectiveFrom,
		EffectiveTo:    args.EffectiveTo,
		CreatedBy:      args.CreatedBy,
		RequestPayload: args.RequestPayload,
	}, nil)
	return err
}

// EnqueueEmailNotification enqueues a batch of emails for background sending.
func (e *Enqueuer) EnqueueEmailNotification(ctx context.Context, scheduleID uuid.UUID, emails emailDtos.SendEmailBulkRequest) error {
	_, err := e.client.Insert(ctx, jobs.EmailNotificationArgs{
		ScheduleID: scheduleID,
		Emails:     emails,
	}, nil)
	return err
}

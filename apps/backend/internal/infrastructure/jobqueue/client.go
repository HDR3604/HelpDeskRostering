package jobqueue

import (
	"context"
	"database/sql"

	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverdatabasesql"
	"go.uber.org/zap"
)

// Client wraps the River client and manages its lifecycle.
type Client struct {
	river  *river.Client[*sql.Tx]
	logger *zap.Logger
}

// NewClient creates a new River job queue client.
func NewClient(db *sql.DB, logger *zap.Logger, workers *river.Workers) (*Client, error) {
	riverClient, err := river.NewClient(riverdatabasesql.New(db), &river.Config{
		Queues: map[string]river.QueueConfig{
			QueueScheduleGeneration: {MaxWorkers: 2},
			QueueEmailNotification:  {MaxWorkers: 5},
		},
		Workers: workers,
		Logger:  newRiverLogger(logger),
	})
	if err != nil {
		return nil, err
	}

	return &Client{river: riverClient, logger: logger}, nil
}

// Start begins processing jobs.
func (c *Client) Start(ctx context.Context) error {
	return c.river.Start(ctx)
}

// Stop gracefully shuts down the client, waiting for in-flight jobs to complete.
func (c *Client) Stop(ctx context.Context) error {
	return c.river.Stop(ctx)
}

// River returns the underlying River client for inserting jobs.
func (c *Client) River() *river.Client[*sql.Tx] {
	return c.river
}

// Queue names
const (
	QueueScheduleGeneration = "schedule_generation"
	QueueEmailNotification  = "email_notification"
)

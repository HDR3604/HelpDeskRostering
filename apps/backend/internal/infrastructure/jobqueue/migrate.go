package jobqueue

import (
	"context"
	"database/sql"

	"github.com/riverqueue/river/riverdriver/riverdatabasesql"
	"github.com/riverqueue/river/rivermigrate"
	"go.uber.org/zap"
)

// Migrate runs River's schema migrations (creates river_job, river_leader, etc.)
// and grants the internal role access to River's tables. This should be called
// at application startup before the client is started.
func Migrate(ctx context.Context, db *sql.DB, logger *zap.Logger) error {
	migrator, err := rivermigrate.New(riverdatabasesql.New(db), nil)
	if err != nil {
		return err
	}

	res, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil)
	if err != nil {
		return err
	}

	for _, v := range res.Versions {
		logger.Info("river migration applied", zap.Int("version", v.Version))
	}

	// Grant all database roles access to River's tables. River's internal
	// queries run on raw pool connections (not via TxManager), so they need
	// explicit grants. This is idempotent.
	grants := []string{
		"GRANT USAGE ON SCHEMA public TO internal, authenticated, helpdesk",
		"GRANT ALL ON river_job TO internal, authenticated, helpdesk",
		"GRANT ALL ON river_queue TO internal, authenticated, helpdesk",
		"GRANT ALL ON river_leader TO internal, authenticated, helpdesk",
		"GRANT ALL ON river_client TO internal, authenticated, helpdesk",
		"GRANT ALL ON river_migration TO internal, authenticated, helpdesk",
		"GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO internal, authenticated, helpdesk",
	}
	for _, g := range grants {
		if _, err := db.ExecContext(ctx, g); err != nil {
			return err
		}
	}

	logger.Info("river table grants applied")
	return nil
}

package database

import (
	"context"
	"database/sql"
	"fmt"

	"go.uber.org/zap"
)

var _ TxManagerInterface = (*TxManager)(nil)

type TxManagerInterface interface {
	InAuthTx(ctx context.Context, authCtx AuthContext, fn func(tx *sql.Tx) error) error
	InSystemTx(ctx context.Context, fn func(tx *sql.Tx) error) error
}

type TxManager struct {
	db     *sql.DB
	logger *zap.Logger
}

func NewTxManager(db *sql.DB, logger *zap.Logger) TxManagerInterface {
	return &TxManager{
		db:     db,
		logger: logger,
	}
}

func (tm *TxManager) InAuthTx(ctx context.Context, authCtx AuthContext, fn func(tx *sql.Tx) error) (err error) {
	tx, err := tm.db.BeginTx(ctx, nil)
	if err != nil {
		tm.logger.Error("failed to begin auth transaction", zap.Error(err))
		return fmt.Errorf("failed to begin auth transaction: %w", err)
	}

	// When the function exits, rollback if there was an error
	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				tm.logger.Warn("rollback failed", zap.Error(rbErr))
			}
		}
	}()

	// Set the database role to authenticated
	if _, err = tx.ExecContext(ctx, "SET ROLE authenticated;"); err != nil {
		tm.logger.Error("failed to set role to authenticated", zap.Error(err))
		return fmt.Errorf("failed to set role to authenticated: %w", err)
	}

	// Set application context variables
	if _, err = tx.ExecContext(ctx, "SELECT set_config('app.current_user_id', $1, true)", authCtx.UserID); err != nil {
		tm.logger.Error("failed to set app.current_user_id", zap.Error(err))
		return fmt.Errorf("failed to set app.current_user_id: %w", err)
	}

	studentID := ""
	// If StudentID is nil, set to empty string to avoid retaining previous value
	if authCtx.StudentID != nil {
		studentID = *authCtx.StudentID
	}
	if _, err = tx.ExecContext(ctx, "SELECT set_config('app.current_student_id', $1, true)", studentID); err != nil {
		tm.logger.Error("failed to set app.current_student_id", zap.Error(err))
		return fmt.Errorf("failed to set app.current_student_id: %w", err)
	}

	if _, err = tx.ExecContext(ctx, "SELECT set_config('app.current_role', $1, true)", authCtx.Role); err != nil {
		tm.logger.Error("failed to set app.current_role", zap.Error(err))
		return fmt.Errorf("failed to set app.current_role: %w", err)
	}

	// Execute the provided function within the transaction
	if err = fn(tx); err != nil {
		tm.logger.Error("transaction function returned an error", zap.Error(err))
		return fmt.Errorf("transaction function returned an error: %w", err)
	}

	return tx.Commit()
}

func (tm *TxManager) InSystemTx(ctx context.Context, fn func(tx *sql.Tx) error) (err error) {
	tx, err := tm.db.BeginTx(ctx, nil)
	if err != nil {
		tm.logger.Error("failed to begin system transaction", zap.Error(err))
		return fmt.Errorf("failed to begin system transaction: %w", err)
	}

	// When the function exits, rollback if there was an error
	defer func() {
		if err != nil {
			if rbErr := tx.Rollback(); rbErr != nil {
				tm.logger.Warn("rollback failed", zap.Error(rbErr))
			}
		}
	}()

	// Set the database role to 'internal' which bypasses RLS policies
	if _, err = tx.ExecContext(ctx, "SET ROLE internal;"); err != nil {
		tm.logger.Error("failed to set role to internal", zap.Error(err))
		return fmt.Errorf("failed to set role to internal: %w", err)
	}

	// Execute the provided function within the transaction
	if err = fn(tx); err != nil {
		tm.logger.Error("transaction function returned an error", zap.Error(err))
		return fmt.Errorf("transaction function returned an error: %w", err)
	}

	return tx.Commit()
}

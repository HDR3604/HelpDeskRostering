package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
)

var _ database.TxManagerInterface = (*StubTxManager)(nil)

// StubTxManager executes transaction functions directly with a nil *sql.Tx.
// Use this in unit tests where the repository is also mocked.
type StubTxManager struct{}

func (s *StubTxManager) InAuthTx(_ context.Context, _ database.AuthContext, fn func(tx *sql.Tx) error) error {
	return fn(nil)
}

func (s *StubTxManager) InSystemTx(_ context.Context, fn func(tx *sql.Tx) error) error {
	return fn(nil)
}

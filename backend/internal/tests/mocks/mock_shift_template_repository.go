package mocks

import (
	"context"
	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/google/uuid"
)

var _ repository.ShiftTemplateRepositoryInterface = (*MockShiftTemplateRepository)(nil)

type MockShiftTemplateRepository struct {
	CreateFn  func(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error)
	GetByIDFn func(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ShiftTemplate, error)
	ListFn    func(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error)
	ListAllFn func(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error)
	UpdateFn  func(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) error
}

func (m *MockShiftTemplateRepository) Create(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) (*aggregate.ShiftTemplate, error) {
	return m.CreateFn(ctx, tx, t)
}

func (m *MockShiftTemplateRepository) GetByID(ctx context.Context, tx *sql.Tx, id uuid.UUID) (*aggregate.ShiftTemplate, error) {
	return m.GetByIDFn(ctx, tx, id)
}

func (m *MockShiftTemplateRepository) List(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
	return m.ListFn(ctx, tx)
}

func (m *MockShiftTemplateRepository) ListAll(ctx context.Context, tx *sql.Tx) ([]*aggregate.ShiftTemplate, error) {
	return m.ListAllFn(ctx, tx)
}

func (m *MockShiftTemplateRepository) Update(ctx context.Context, tx *sql.Tx, t *aggregate.ShiftTemplate) error {
	return m.UpdateFn(ctx, tx, t)
}

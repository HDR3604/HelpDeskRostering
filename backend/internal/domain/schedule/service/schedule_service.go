package service

import (
	"context"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/repository"
	"github.com/google/uuid"
	"go.uber.org/zap"
)

type ScheduleServiceInterface interface {
	Create(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error)
	GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error)
	ListArchived(ctx context.Context) ([]*aggregate.Schedule, error)
	List(ctx context.Context) ([]*aggregate.Schedule, error)
	Archive(ctx context.Context, id uuid.UUID) error
	Unarchive(ctx context.Context, id uuid.UUID) error
	Activate(ctx context.Context, id uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
}

type ScheduleService struct {
	logger     *zap.Logger
	repository repository.ScheduleRepositoryInterface
}

func NewScheduleService(logger *zap.Logger, repository repository.ScheduleRepositoryInterface) *ScheduleService {
	return &ScheduleService{
		logger:     logger,
		repository: repository,
	}
}

func (s *ScheduleService) Create(ctx context.Context, schedule *aggregate.Schedule) (*aggregate.Schedule, error) {
	return nil, nil
}

func (s *ScheduleService) GetByID(ctx context.Context, id uuid.UUID) (*aggregate.Schedule, error) {
	return nil, nil
}

func (s *ScheduleService) ListArchived(ctx context.Context) ([]*aggregate.Schedule, error) {
	return nil, nil
}

func (s *ScheduleService) List(ctx context.Context) ([]*aggregate.Schedule, error) {
	return nil, nil
}

func (s *ScheduleService) Archive(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (s *ScheduleService) Unarchive(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (s *ScheduleService) Activate(ctx context.Context, id uuid.UUID) error {
	return nil
}

func (s *ScheduleService) Deactivate(ctx context.Context, id uuid.UUID) error {
	return nil
}

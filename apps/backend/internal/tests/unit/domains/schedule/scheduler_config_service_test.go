package schedule_test

import (
	"context"
	"database/sql"
	"fmt"
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/aggregate"
	scheduleErrors "github.com/HDR3604/HelpDeskApp/internal/domain/schedule/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/schedule/service"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/tests/mocks"
	"github.com/google/uuid"
	"github.com/stretchr/testify/suite"
	"go.uber.org/zap"
)

type SchedulerConfigServiceTestSuite struct {
	suite.Suite
	repo    *mocks.MockSchedulerConfigRepository
	service service.SchedulerConfigServiceInterface
	authCtx context.Context
	userID  uuid.UUID
}

func TestSchedulerConfigServiceTestSuite(t *testing.T) {
	suite.Run(t, new(SchedulerConfigServiceTestSuite))
}

func (s *SchedulerConfigServiceTestSuite) SetupTest() {
	s.repo = &mocks.MockSchedulerConfigRepository{}
	s.userID = uuid.New()
	svc := service.NewSchedulerConfigService(zap.NewNop(), s.repo, &mocks.StubTxManager{})
	s.service = svc
	s.authCtx = database.WithAuthContext(context.Background(), database.AuthContext{
		UserID: s.userID.String(),
		Role:   "admin",
	})
}

func (s *SchedulerConfigServiceTestSuite) newSchedulerConfig() *aggregate.SchedulerConfig {
	return &aggregate.SchedulerConfig{
		ID:                    uuid.New(),
		Name:                  "Test Config",
		CourseShortfallPenalty: 10.0,
		MinHoursPenalty:       5.0,
		MaxHoursPenalty:       5.0,
		UnderstaffedPenalty:   8.0,
		ExtraHoursPenalty:     3.0,
		MaxExtraPenalty:       4.0,
		BaselineHoursTarget:   10,
		LogSolverOutput:       false,
		IsDefault:             false,
		CreatedAt:             time.Now(),
	}
}

// --- Create ---

func (s *SchedulerConfigServiceTestSuite) TestCreate_Success() {
	input := s.newSchedulerConfig()
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
		return c, nil
	}

	result, err := s.service.Create(s.authCtx, input)

	s.Require().NoError(err)
	s.Equal(input.Name, result.Name)
}

func (s *SchedulerConfigServiceTestSuite) TestCreate_MissingAuthContext() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, c *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
		return c, nil
	}

	result, err := s.service.Create(context.Background(), s.newSchedulerConfig())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

func (s *SchedulerConfigServiceTestSuite) TestCreate_RepositoryError() {
	s.repo.CreateFn = func(_ context.Context, _ *sql.Tx, _ *aggregate.SchedulerConfig) (*aggregate.SchedulerConfig, error) {
		return nil, fmt.Errorf("db error")
	}

	result, err := s.service.Create(s.authCtx, s.newSchedulerConfig())

	s.Require().Error(err)
	s.Nil(result)
	s.Contains(err.Error(), "db error")
}

// --- GetByID ---

func (s *SchedulerConfigServiceTestSuite) TestGetByID_Success() {
	expected := s.newSchedulerConfig()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
		s.Equal(expected.ID, id)
		return expected, nil
	}

	result, err := s.service.GetByID(s.authCtx, expected.ID)

	s.Require().NoError(err)
	s.Equal(expected.ID, result.ID)
}

func (s *SchedulerConfigServiceTestSuite) TestGetByID_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	result, err := s.service.GetByID(s.authCtx, uuid.New())

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrSchedulerConfigNotFound)
	s.Nil(result)
}

func (s *SchedulerConfigServiceTestSuite) TestGetByID_MissingAuthContext() {
	result, err := s.service.GetByID(context.Background(), uuid.New())

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- GetDefault ---

func (s *SchedulerConfigServiceTestSuite) TestGetDefault_Success() {
	expected := s.newSchedulerConfig()
	expected.IsDefault = true
	s.repo.GetDefaultFn = func(_ context.Context, _ *sql.Tx) (*aggregate.SchedulerConfig, error) {
		return expected, nil
	}

	result, err := s.service.GetDefault(s.authCtx)

	s.Require().NoError(err)
	s.Equal(expected.ID, result.ID)
	s.True(result.IsDefault)
}

func (s *SchedulerConfigServiceTestSuite) TestGetDefault_NotFound() {
	s.repo.GetDefaultFn = func(_ context.Context, _ *sql.Tx) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	result, err := s.service.GetDefault(s.authCtx)

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrSchedulerConfigNotFound)
	s.Nil(result)
}

// --- List ---

func (s *SchedulerConfigServiceTestSuite) TestList_Success() {
	expected := []*aggregate.SchedulerConfig{s.newSchedulerConfig(), s.newSchedulerConfig()}
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.SchedulerConfig, error) {
		return expected, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Len(result, 2)
}

func (s *SchedulerConfigServiceTestSuite) TestList_Empty() {
	s.repo.ListFn = func(_ context.Context, _ *sql.Tx) ([]*aggregate.SchedulerConfig, error) {
		return []*aggregate.SchedulerConfig{}, nil
	}

	result, err := s.service.List(s.authCtx)

	s.Require().NoError(err)
	s.Empty(result)
}

// --- Update ---

func (s *SchedulerConfigServiceTestSuite) TestUpdate_Success() {
	existing := s.newSchedulerConfig()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
		s.Equal(existing.ID, id)
		return existing, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, c *aggregate.SchedulerConfig) error {
		s.Equal("Updated Config", c.Name)
		return nil
	}

	params := service.UpdateSchedulerConfigParams{
		Name:                  "Updated Config",
		CourseShortfallPenalty: 12.0,
		MinHoursPenalty:       6.0,
		MaxHoursPenalty:       6.0,
		UnderstaffedPenalty:   9.0,
		ExtraHoursPenalty:     4.0,
		MaxExtraPenalty:       5.0,
		BaselineHoursTarget:   12,
		LogSolverOutput:       true,
	}

	result, err := s.service.Update(s.authCtx, existing.ID, params)

	s.Require().NoError(err)
	s.Equal("Updated Config", result.Name)
	s.Equal(float64(12.0), result.CourseShortfallPenalty)
	s.Equal(int32(12), result.BaselineHoursTarget)
	s.True(result.LogSolverOutput)
}

func (s *SchedulerConfigServiceTestSuite) TestUpdate_NotFound() {
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	params := service.UpdateSchedulerConfigParams{
		Name:                  "Updated Config",
		CourseShortfallPenalty: 10.0,
		MinHoursPenalty:       5.0,
		MaxHoursPenalty:       5.0,
		UnderstaffedPenalty:   8.0,
		ExtraHoursPenalty:     3.0,
		MaxExtraPenalty:       4.0,
		BaselineHoursTarget:   10,
	}

	result, err := s.service.Update(s.authCtx, uuid.New(), params)

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrSchedulerConfigNotFound)
	s.Nil(result)
}

func (s *SchedulerConfigServiceTestSuite) TestUpdate_ValidationError() {
	existing := s.newSchedulerConfig()
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return existing, nil
	}

	params := service.UpdateSchedulerConfigParams{
		Name:                  "",
		CourseShortfallPenalty: 10.0,
		MinHoursPenalty:       5.0,
		MaxHoursPenalty:       5.0,
		UnderstaffedPenalty:   8.0,
		ExtraHoursPenalty:     3.0,
		MaxExtraPenalty:       4.0,
		BaselineHoursTarget:   10,
	}

	result, err := s.service.Update(s.authCtx, existing.ID, params)

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrInvalidConfigName)
	s.Nil(result)
}

func (s *SchedulerConfigServiceTestSuite) TestUpdate_MissingAuthContext() {
	params := service.UpdateSchedulerConfigParams{
		Name:                  "Updated Config",
		CourseShortfallPenalty: 10.0,
		MinHoursPenalty:       5.0,
		MaxHoursPenalty:       5.0,
		UnderstaffedPenalty:   8.0,
		ExtraHoursPenalty:     3.0,
		MaxExtraPenalty:       4.0,
		BaselineHoursTarget:   10,
	}

	result, err := s.service.Update(context.Background(), uuid.New(), params)

	s.ErrorIs(err, scheduleErrors.ErrMissingAuthContext)
	s.Nil(result)
}

// --- SetDefault ---

func (s *SchedulerConfigServiceTestSuite) TestSetDefault_Success() {
	currentDefault := s.newSchedulerConfig()
	currentDefault.IsDefault = true

	target := s.newSchedulerConfig()
	target.IsDefault = false

	var updateCalls int
	s.repo.GetDefaultFn = func(_ context.Context, _ *sql.Tx) (*aggregate.SchedulerConfig, error) {
		return currentDefault, nil
	}
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
		s.Equal(target.ID, id)
		return target, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, c *aggregate.SchedulerConfig) error {
		updateCalls++
		if updateCalls == 1 {
			// First call: clearing the current default
			s.Equal(currentDefault.ID, c.ID)
			s.False(c.IsDefault)
		} else if updateCalls == 2 {
			// Second call: setting the new default
			s.Equal(target.ID, c.ID)
			s.True(c.IsDefault)
		}
		return nil
	}

	err := s.service.SetDefault(s.authCtx, target.ID)

	s.Require().NoError(err)
	s.Equal(2, updateCalls)
}

func (s *SchedulerConfigServiceTestSuite) TestSetDefault_NoCurrentDefault() {
	target := s.newSchedulerConfig()
	target.IsDefault = false

	var updateCalls int
	s.repo.GetDefaultFn = func(_ context.Context, _ *sql.Tx) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, id uuid.UUID) (*aggregate.SchedulerConfig, error) {
		s.Equal(target.ID, id)
		return target, nil
	}
	s.repo.UpdateFn = func(_ context.Context, _ *sql.Tx, c *aggregate.SchedulerConfig) error {
		updateCalls++
		s.Equal(target.ID, c.ID)
		s.True(c.IsDefault)
		return nil
	}

	err := s.service.SetDefault(s.authCtx, target.ID)

	s.Require().NoError(err)
	s.Equal(1, updateCalls)
}

func (s *SchedulerConfigServiceTestSuite) TestSetDefault_NotFound() {
	s.repo.GetDefaultFn = func(_ context.Context, _ *sql.Tx) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}
	s.repo.GetByIDFn = func(_ context.Context, _ *sql.Tx, _ uuid.UUID) (*aggregate.SchedulerConfig, error) {
		return nil, scheduleErrors.ErrSchedulerConfigNotFound
	}

	err := s.service.SetDefault(s.authCtx, uuid.New())

	s.Require().Error(err)
	s.ErrorIs(err, scheduleErrors.ErrSchedulerConfigNotFound)
}

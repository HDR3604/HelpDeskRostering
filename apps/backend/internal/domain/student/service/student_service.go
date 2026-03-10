package service

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/HDR3604/HelpDeskApp/internal/domain/student/aggregate"
	studentErrors "github.com/HDR3604/HelpDeskApp/internal/domain/student/errors"
	"github.com/HDR3604/HelpDeskApp/internal/domain/student/repository"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/database"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/transcripts/types"
	"go.uber.org/zap"
)

type StudentServiceInterface interface {
	Apply(ctx context.Context, input ApplyInput) (*aggregate.Student, error)
	GetByID(ctx context.Context, studentID int32) (*aggregate.Student, error)
	GetByEmail(ctx context.Context, email string) (*aggregate.Student, error)
	List(ctx context.Context, status string) ([]*aggregate.Student, error)
	Accept(ctx context.Context, studentID int32) (*aggregate.Student, error)
	Reject(ctx context.Context, studentID int32) (*aggregate.Student, error)
	Deactivate(ctx context.Context, studentID int32) (*aggregate.Student, error)
	Activate(ctx context.Context, studentID int32) (*aggregate.Student, error)
	BulkDeactivate(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error)
	BulkActivate(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error)
	Update(ctx context.Context, studentID int32, input UpdateStudentInput) (*aggregate.Student, error)
}

type ApplyInput struct {
	Email              string
	PhoneNumber        string
	TranscriptMetadata types.TranscriptMetadata
	Availability       json.RawMessage
}

type UpdateStudentInput struct {
	PhoneNumber    *string
	Availability   *json.RawMessage
	MinWeeklyHours *float64
	MaxWeeklyHours *float64
}

type StudentService struct {
	logger     *zap.Logger
	repository repository.StudentRepositoryInterface
	txManager  database.TxManagerInterface
}

var _ StudentServiceInterface = (*StudentService)(nil)

func NewStudentService(
	logger *zap.Logger,
	repository repository.StudentRepositoryInterface,
	txManager database.TxManagerInterface,
) *StudentService {
	return &StudentService{
		logger:     logger,
		repository: repository,
		txManager:  txManager,
	}
}

func (s *StudentService) authCtx(ctx context.Context) (database.AuthContext, error) {
	authCtx, ok := database.GetAuthContextFromContext(ctx)
	if !ok {
		s.logger.Error("missing auth context in request")
		return database.AuthContext{}, studentErrors.ErrMissingAuthContext
	}
	return authCtx, nil
}

// Apply creates a new student application (public, no auth).
func (s *StudentService) Apply(ctx context.Context, input ApplyInput) (*aggregate.Student, error) {
	s.logger.Info("applying student", zap.String("email", input.Email))

	student, err := aggregate.NewStudent(input.Email, input.PhoneNumber, input.TranscriptMetadata, input.Availability)
	if err != nil {
		return nil, err
	}

	var result *aggregate.Student
	err = s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		// Check for existing application
		existing, txErr := s.repository.GetByEmail(ctx, tx, input.Email)
		if txErr != nil && !errors.Is(txErr, studentErrors.ErrNotFound) {
			return txErr
		}
		if existing != nil {
			return studentErrors.ErrAlreadyExists
		}

		var createErr error
		result, createErr = s.repository.Create(ctx, tx, student)
		return createErr
	})
	if err != nil {
		s.logger.Error("failed to apply student", zap.String("email", input.Email), zap.Error(err))
		return nil, err
	}

	s.logger.Info("student application created", zap.String("email", input.Email))
	return result, nil
}

func (s *StudentService) GetByID(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	s.logger.Debug("getting student by ID", zap.Int32("studentID", studentID))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.Student
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByID(ctx, tx, studentID)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get student by ID", zap.Int32("studentID", studentID), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *StudentService) GetByEmail(ctx context.Context, email string) (*aggregate.Student, error) {
	s.logger.Debug("getting student by email", zap.String("email", email))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result *aggregate.Student
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		result, txErr = s.repository.GetByEmail(ctx, tx, email)
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to get student by email", zap.String("email", email), zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *StudentService) List(ctx context.Context, status string) ([]*aggregate.Student, error) {
	s.logger.Debug("listing students", zap.String("status", status))

	authCtx, err := s.authCtx(ctx)
	if err != nil {
		return nil, err
	}

	var result []*aggregate.Student
	err = s.txManager.InAuthTx(ctx, authCtx, func(tx *sql.Tx) error {
		var txErr error
		if status != "" {
			result, txErr = s.repository.ListByStatus(ctx, tx, status)
		} else {
			result, txErr = s.repository.List(ctx, tx)
		}
		return txErr
	})
	if err != nil {
		s.logger.Error("failed to list students", zap.Error(err))
		return nil, err
	}

	return result, nil
}

func (s *StudentService) Accept(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	s.logger.Info("accepting student", zap.Int32("studentID", studentID))

	var result *aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		student, txErr := s.repository.GetByID(ctx, tx, studentID)
		if txErr != nil {
			return txErr
		}

		if err := student.Accept(); err != nil {
			return err
		}

		if err := s.repository.Update(ctx, tx, student); err != nil {
			return err
		}

		result = student
		return nil
	})
	if err != nil {
		s.logger.Error("failed to accept student", zap.Int32("studentID", studentID), zap.Error(err))
		return nil, err
	}

	s.logger.Info("student accepted", zap.Int32("studentID", studentID))
	return result, nil
}

func (s *StudentService) Reject(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	s.logger.Info("rejecting student", zap.Int32("studentID", studentID))

	var result *aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		student, txErr := s.repository.GetByID(ctx, tx, studentID)
		if txErr != nil {
			return txErr
		}

		if err := student.Reject(); err != nil {
			return err
		}

		if err := s.repository.Update(ctx, tx, student); err != nil {
			return err
		}

		result = student
		return nil
	})
	if err != nil {
		s.logger.Error("failed to reject student", zap.Int32("studentID", studentID), zap.Error(err))
		return nil, err
	}

	s.logger.Info("student rejected", zap.Int32("studentID", studentID))
	return result, nil
}

func (s *StudentService) Deactivate(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	s.logger.Info("deactivating student", zap.Int32("studentID", studentID))

	var result *aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		student, txErr := s.repository.GetByID(ctx, tx, studentID)
		if txErr != nil {
			return txErr
		}

		if err := student.Deactivate(); err != nil {
			return err
		}

		if err := s.repository.Update(ctx, tx, student); err != nil {
			return err
		}

		result = student
		return nil
	})
	if err != nil {
		s.logger.Error("failed to deactivate student", zap.Int32("studentID", studentID), zap.Error(err))
		return nil, err
	}

	s.logger.Info("student deactivated", zap.Int32("studentID", studentID))
	return result, nil
}

func (s *StudentService) Activate(ctx context.Context, studentID int32) (*aggregate.Student, error) {
	s.logger.Info("activating student", zap.Int32("studentID", studentID))

	var result *aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		student, txErr := s.repository.GetByIDIncludingDeactivated(ctx, tx, studentID)
		if txErr != nil {
			return txErr
		}

		if err := student.Activate(); err != nil {
			return err
		}

		if err := s.repository.Update(ctx, tx, student); err != nil {
			return err
		}

		result = student
		return nil
	})
	if err != nil {
		s.logger.Error("failed to activate student", zap.Int32("studentID", studentID), zap.Error(err))
		return nil, err
	}

	s.logger.Info("student activated", zap.Int32("studentID", studentID))
	return result, nil
}

func (s *StudentService) BulkDeactivate(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error) {
	s.logger.Info("bulk deactivating students", zap.Int32s("studentIDs", studentIDs))

	var results []*aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		for _, id := range studentIDs {
			student, txErr := s.repository.GetByID(ctx, tx, id)
			if txErr != nil {
				return txErr
			}
			if err := student.Deactivate(); err != nil {
				return err
			}
			if err := s.repository.Update(ctx, tx, student); err != nil {
				return err
			}
			results = append(results, student)
		}
		return nil
	})
	if err != nil {
		s.logger.Error("failed to bulk deactivate students", zap.Error(err))
		return nil, err
	}

	s.logger.Info("students bulk deactivated", zap.Int("count", len(results)))
	return results, nil
}

func (s *StudentService) BulkActivate(ctx context.Context, studentIDs []int32) ([]*aggregate.Student, error) {
	s.logger.Info("bulk activating students", zap.Int32s("studentIDs", studentIDs))

	var results []*aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		for _, id := range studentIDs {
			student, txErr := s.repository.GetByIDIncludingDeactivated(ctx, tx, id)
			if txErr != nil {
				return txErr
			}
			if err := student.Activate(); err != nil {
				return err
			}
			if err := s.repository.Update(ctx, tx, student); err != nil {
				return err
			}
			results = append(results, student)
		}
		return nil
	})
	if err != nil {
		s.logger.Error("failed to bulk activate students", zap.Error(err))
		return nil, err
	}

	s.logger.Info("students bulk activated", zap.Int("count", len(results)))
	return results, nil
}

func (s *StudentService) Update(ctx context.Context, studentID int32, input UpdateStudentInput) (*aggregate.Student, error) {
	s.logger.Info("updating student", zap.Int32("studentID", studentID))

	var result *aggregate.Student
	err := s.txManager.InSystemTx(ctx, func(tx *sql.Tx) error {
		student, txErr := s.repository.GetByID(ctx, tx, studentID)
		if txErr != nil {
			return txErr
		}

		if input.PhoneNumber != nil {
			if err := student.UpdatePhoneNumber(*input.PhoneNumber); err != nil {
				return err
			}
		}

		if input.Availability != nil {
			if err := student.UpdateAvailability(*input.Availability); err != nil {
				return err
			}
		}

		if input.MinWeeklyHours != nil {
			student.MinWeeklyHours = *input.MinWeeklyHours
		}

		if input.MaxWeeklyHours != nil {
			student.MaxWeeklyHours = input.MaxWeeklyHours
		}

		if err := s.repository.Update(ctx, tx, student); err != nil {
			return err
		}

		result = student
		return nil
	})
	if err != nil {
		s.logger.Error("failed to update student", zap.Int32("studentID", studentID), zap.Error(err))
		return nil, err
	}

	s.logger.Info("student updated", zap.Int32("studentID", studentID))
	return result, nil
}

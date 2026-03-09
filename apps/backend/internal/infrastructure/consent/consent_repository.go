package consent

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net"

	consentDomain "github.com/HDR3604/HelpDeskApp/internal/domain/consent"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/table"
	"github.com/go-jet/jet/v2/postgres"
	"github.com/go-jet/jet/v2/qrm"
	"go.uber.org/zap"
)

var _ consentDomain.RepositoryInterface = (*ConsentRepository)(nil)

type ConsentRepository struct {
	logger *zap.Logger
}

func NewConsentRepository(logger *zap.Logger) consentDomain.RepositoryInterface {
	return &ConsentRepository{logger: logger}
}

func (r *ConsentRepository) Create(
	ctx context.Context,
	tx *sql.Tx,
	studentID int32,
	consentVersion string,
	ipAddress net.IP,
) (*consentDomain.BankingConsent, error) {
	var ipStr *string
	if ipAddress != nil {
		s := ipAddress.String()
		ipStr = &s
	}

	cols := postgres.ColumnList{
		table.StudentBankingConsent.StudentID,
		table.StudentBankingConsent.ConsentVersion,
	}
	vals := postgres.Row(
		postgres.Int32(studentID),
		postgres.String(consentVersion),
	)

	if ipStr != nil {
		cols = append(cols, table.StudentBankingConsent.IPAddress)
		vals = append(vals, postgres.String(*ipStr))
	}

	stmt := table.StudentBankingConsent.
		INSERT(cols...).
		VALUES(vals...).
		RETURNING(table.StudentBankingConsent.AllColumns)

	var result model.StudentBankingConsent
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		r.logger.Error("failed to create consent record", zap.Error(err))
		return nil, fmt.Errorf("failed to create consent record: %w", err)
	}

	return modelToAggregate(&result), nil
}

func (r *ConsentRepository) GetByStudentID(
	ctx context.Context,
	tx *sql.Tx,
	studentID int32,
) (*consentDomain.BankingConsent, error) {
	stmt := table.StudentBankingConsent.
		SELECT(table.StudentBankingConsent.AllColumns).
		WHERE(table.StudentBankingConsent.StudentID.EQ(postgres.Int32(studentID))).
		ORDER_BY(table.StudentBankingConsent.ConsentedAt.DESC()).
		LIMIT(1)

	var result model.StudentBankingConsent
	err := stmt.QueryContext(ctx, tx, &result)
	if err != nil {
		if errors.Is(err, qrm.ErrNoRows) {
			return nil, consentDomain.ErrConsentNotFound
		}
		r.logger.Error("failed to get consent record", zap.Error(err), zap.Int32("student_id", studentID))
		return nil, fmt.Errorf("failed to get consent record: %w", err)
	}

	return modelToAggregate(&result), nil
}

func modelToAggregate(m *model.StudentBankingConsent) *consentDomain.BankingConsent {
	var ip net.IP
	if m.IPAddress != nil {
		ip = net.ParseIP(*m.IPAddress)
	}

	return &consentDomain.BankingConsent{
		ID:             m.ID,
		StudentID:      m.StudentID,
		ConsentedAt:    m.ConsentedAt,
		ConsentVersion: m.ConsentVersion,
		IPAddress:      ip,
	}
}

package consent

import (
	"context"
	"database/sql"
	"net"
)

type RepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, studentID int32, consentVersion string, ipAddress net.IP) (*BankingConsent, error)
	GetByStudentID(ctx context.Context, tx *sql.Tx, studentID int32) (*BankingConsent, error)
}

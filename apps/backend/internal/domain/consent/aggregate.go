package consent

import (
	"net"
	"time"

	"github.com/google/uuid"
)

// BankingConsent represents an immutable record of a student's consent
// to the collection and processing of their banking information.
type BankingConsent struct {
	ID             uuid.UUID
	StudentID      int32
	ConsentedAt    time.Time
	ConsentVersion string
	IPAddress      net.IP
}

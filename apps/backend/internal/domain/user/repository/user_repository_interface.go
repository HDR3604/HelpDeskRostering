package repository

import (
	"context"

	"database/sql"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
)

type UserRepositoryInterface interface {
	Create(ctx context.Context, tx *sql.Tx, user *aggregate.User) (*aggregate.User, error)
	GetByID(ctx context.Context, tx *sql.Tx, userID string) (*aggregate.User, error)
	GetByEmail(ctx context.Context, tx *sql.Tx, email string) (*aggregate.User, error)
	Update(ctx context.Context, tx *sql.Tx, user *aggregate.User) error
	DeactivateByEmailDomain(ctx context.Context, tx *sql.Tx, ed aggregate.EmailDomain) error
	List(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error)
	ListByRole(ctx context.Context, tx *sql.Tx, role string) ([]*aggregate.User, error)
	ListActive(ctx context.Context, tx *sql.Tx) ([]*aggregate.User, error)
}

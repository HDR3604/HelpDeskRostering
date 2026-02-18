package aggregate

import (
	"regexp"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/google/uuid"
)

// Role constants - mapped to database models
type EmailDomain string

const (
	EmailDomain_Staff   EmailDomain = "@uwi.edu"
	EmailDomain_Student EmailDomain = "@my.uwi.edu"
)

var EmailDomains = []EmailDomain{EmailDomain_Staff, EmailDomain_Student}

type Role string

const (
	Role_Admin   Role = "admin"
	Role_Student Role = "student"
)

var RoleValues = []Role{Role_Admin, Role_Student}

type User struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Password  string     `json:"password"`
	Role      Role       `json:"role"`
	IsActive  bool       `json:"is_active"`
	CreatedAt *time.Time `json:"created_at"`
	UpdatedAt *time.Time `json:"updated_at"`
}

// NewUser creates a new User with validation
func NewUser(email, password string, role Role) (*User, error) {
	// Validate email
	if isValidEmail(email) != nil {
		return nil, errors.ErrInvalidEmail
	}

	// Validate role
	if !isValidRole(role) {
		return nil, errors.ErrInvalidRole
	}

	// Validate role against email domain
	if err := ValidateRoleAgainstEmail(role, email); err != nil {
		return nil, err
	}

	// Validate password
	if err := validatePassword(password); err != nil {
		return nil, err
	}

	return &User{
		ID:       uuid.New(),
		Email:    email,
		Password: password,
		Role:     role,
		IsActive: true,
	}, nil
}

func validatePassword(password string) error {
	if len(password) < 6 {
		return errors.ErrInvalidPasswordLength
	}
	hasLetter := regexp.MustCompile(`[A-Za-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)
	if !hasLetter || !hasDigit {
		return errors.ErrInvalidPasswordComplexity
	}
	return nil
}

// Activate marks the user as active
func (u *User) Activate() error {
	if u.IsActive {
		return nil // No error if already active
	}
	newTime := time.Now()
	u.IsActive = true
	u.UpdatedAt = &newTime
	return nil
}

// Deactivate marks the user as inactive
func (u *User) Deactivate() error {
	if !u.IsActive {
		return nil // No error if already inactive
	}
	newTime := time.Now()
	u.IsActive = false
	u.UpdatedAt = &newTime
	return nil
}

// UpdateEmail updates the user's email with validation
func (u *User) UpdateEmail(newEmail string) error {
	if isValidEmail(newEmail) != nil {
		return errors.ErrInvalidEmail
	}

	if newEmail == u.Email {
		return errors.ErrEmailUnchanged
	}
	newTime := time.Now()
	u.Email = newEmail
	u.UpdatedAt = &newTime
	return nil
}

// UpdateRole updates the user's role with validation
func (u *User) UpdateRole(newRole Role) error {
	if !isValidRole(newRole) {
		return errors.ErrInvalidRole
	}

	if newRole == u.Role {
		return errors.ErrRoleUnchanged
	}

	u.Role = newRole
	return nil
}

// isValidEmail checks if email format is valid
func isValidEmail(email string) error {
	if len(strings.TrimSpace(email)) == 0 {
		return errors.ErrInvalidEmail
	}
	if !strings.HasSuffix(email, string(EmailDomain_Student)) && !strings.HasSuffix(email, string(EmailDomain_Staff)) {
		return errors.ErrInvalidEmail
	}

	// Simple email regex validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return errors.ErrInvalidEmail
	}
	return nil
}

// isValidRole checks if role is valid
func isValidRole(role Role) bool {
	validRoles := map[Role]bool{
		Role_Admin:   true,
		Role_Student: true,
	}
	return validRoles[role]
}

// ValidRoles returns a list of valid roles
func ValidRoles() []Role {
	return []Role{Role_Admin, Role_Student}
}

// Roles returns the model.Roles enum values
func Roles() []model.Roles {
	return model.RolesAllValues
}

func ValidateRoleAgainstEmail(role Role, email string) error {
	if role == Role_Admin && !strings.HasSuffix(email, "@uwi.edu") {
		return errors.ErrEmailAdmin
	} else if role == Role_Student && !strings.HasSuffix(email, "@my.uwi.edu") {
		return errors.ErrEmailStudent
	}
	return nil
}

// ToModel converts the User aggregate to the database model
func (u *User) ToModel() *model.Users {
	return &model.Users{
		UserID:       u.ID,
		EmailAddress: u.Email,
		Password:     u.Password,
		Role:         model.Roles(u.Role),
		IsActive:     u.IsActive,
	}
}

// UserFromModel converts the database model to a User aggregate
func UserFromModel(m *model.Users) *User {
	var createdAt *time.Time
	if !m.CreatedAt.IsZero() {
		createdAt = &m.CreatedAt
	}
	return &User{
		ID:        m.UserID,
		Email:     m.EmailAddress,
		Password:  m.Password,
		Role:      Role(m.Role),
		IsActive:  m.IsActive,
		CreatedAt: createdAt,
		UpdatedAt: m.UpdatedAt,
	}
}

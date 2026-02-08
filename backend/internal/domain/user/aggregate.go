package user

import (
	"errors"
	"regexp"
	"strings"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/infrastructure/models/helpdesk/auth/model"
	"github.com/google/uuid"
)

// Role constants - mapped to database models
type Role string

const (
	Role_Admin   Role = "admin"
	Role_Student Role = "student"
)

var RoleValues = []Role{Role_Admin, Role_Student}

type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	Role      Role      `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewUser creates a new User with validation
func NewUser(email, password string, role Role) (*User, error) {
	// Validate email
	if isValidEmail(email) != nil {
		return nil, ErrInvalidEmail
	}

	// Validate role
	if !isValidRole(role) {
		return nil, ErrInvalidRole
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
		return ErrInvalidPasswordLength
	}
	hasLetter := regexp.MustCompile(`[A-Za-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)
	if !hasLetter || !hasDigit {
		return ErrInvalidPasswordComplexity
	}
	return nil
}

// Activate marks the user as active
func (u *User) Activate() error {
	if u.IsActive {
		return nil // No error if already active
	}
	u.IsActive = true
	u.UpdatedAt = time.Now()
	return nil
}

// Deactivate marks the user as inactive
func (u *User) Deactivate() error {
	if !u.IsActive {
		return nil // No error if already inactive
	}
	u.IsActive = false
	u.UpdatedAt = time.Now()
	return nil
}

// UpdateEmail updates the user's email with validation
func (u *User) UpdateEmail(newEmail string) error {
	if isValidEmail(newEmail) != nil {
		return ErrInvalidEmail
	}

	if newEmail == u.Email {
		return ErrEmailUnchanged
	}

	u.Email = newEmail
	u.UpdatedAt = time.Now()
	return nil
}

// UpdateRole updates the user's role with validation
func (u *User) UpdateRole(newRole Role) error {
	if !isValidRole(newRole) {
		return ErrInvalidRole
	}

	if newRole == u.Role {
		return ErrRoleUnchanged
	}

	u.Role = newRole
	return nil
}

// isValidEmail checks if email format is valid
func isValidEmail(email string) error {
	if len(strings.TrimSpace(email)) == 0 {
		return ErrInvalidEmail
	}
	if !strings.HasSuffix(email, "@my.uwi.edu") && !strings.HasSuffix(email, "@uwi.edu") {
		return ErrInvalidEmail
	}

	// Simple email regex validation
	emailRegex := regexp.MustCompile(`^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$`)
	if !emailRegex.MatchString(email) {
		return ErrInvalidEmail
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
		return errors.New("admin email must end with @uwi.edu")
	} else if role == Role_Student && !strings.HasSuffix(email, "@my.uwi.edu") {
		return errors.New("student email must end with @my.uwi.edu")
	}
	return nil
}

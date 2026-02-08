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
const (
	RoleAdmin   = "admin"
	RoleStudent = "student"
)

type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewUser creates a new User with validation
func NewUser(email, password, role string) (*User, error) {
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

	now := time.Now()
	return &User{
		ID:        uuid.New(),
		Email:     email,
		Password:  password,
		Role:      role,
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

func validatePassword(password string) error {
	if len(password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	hasLetter := regexp.MustCompile(`[A-Za-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)
	if !hasLetter || !hasDigit {
		return errors.New("password must contain at least one letter and one number")
	}
	return nil
}

// Activate marks the user as active
func (u *User) Activate() error {
	if u.IsActive {
		return errors.New("user is already active")
	}
	u.IsActive = true
	u.UpdatedAt = time.Now()
	return nil
}

// Deactivate marks the user as inactive
func (u *User) Deactivate() error {
	if !u.IsActive {
		return errors.New("user is already inactive")
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
		return errors.New("new email must be different from current email")
	}

	u.Email = newEmail
	u.UpdatedAt = time.Now()
	return nil
}

// UpdateRole updates the user's role with validation
func (u *User) UpdateRole(newRole string) error {
	if !isValidRole(newRole) {
		return ErrInvalidRole
	}

	if newRole == u.Role {
		return errors.New("new role must be different from current role")
	}

	u.Role = newRole
	u.UpdatedAt = time.Now()
	return nil
}

// isValidEmail checks if email format is valid
func isValidEmail(email string) error {
	if len(email) == 0 {
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
func isValidRole(role string) bool {
	validRoles := map[string]bool{
		RoleAdmin:   true,
		RoleStudent: true,
	}
	return validRoles[role]
}

// ValidRoles returns a list of valid roles
func ValidRoles() []string {
	return []string{RoleAdmin, RoleStudent}
}

// Roles returns the model.Roles enum values
func Roles() []model.Roles {
	return model.RolesAllValues
}

func ValidateRoleAgainstEmail(role, email string) error {
	if role == RoleAdmin && !strings.HasSuffix(email, "@uwi.edu") {
		return errors.New("admin email must end with @uwi.edu")
	} else if role == RoleStudent && !strings.HasSuffix(email, "@my.uwi.edu") {
		return errors.New("student email must end with @my.uwi.edu")
	}
	return nil
}

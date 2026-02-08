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
<<<<<<< HEAD
type Role string

const (
	Role_Admin   Role = "admin"
	Role_Student Role = "student"
)

var RoleValues = []Role{Role_Admin, Role_Student}

=======
const (
	RoleAdmin   = "admin"
	RoleStudent = "student"
)

>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
type User struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	Password  string    `json:"password"`
<<<<<<< HEAD
	Role      Role      `json:"role"`
=======
	Role      string    `json:"role"`
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// NewUser creates a new User with validation
<<<<<<< HEAD
func NewUser(email, password string, role Role) (*User, error) {
=======
func NewUser(email, password, role string) (*User, error) {
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
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

<<<<<<< HEAD
	return &User{
		ID:       uuid.New(),
		Email:    email,
		Password: password,
		Role:     role,
		IsActive: true,
=======
	now := time.Now()
	return &User{
		ID:        uuid.New(),
		Email:     email,
		Password:  password,
		Role:      role,
		IsActive:  true,
		CreatedAt: now,
		UpdatedAt: now,
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	}, nil
}

func validatePassword(password string) error {
	if len(password) < 6 {
<<<<<<< HEAD
		return ErrInvalidPasswordLength
=======
		return errors.New("password must be at least 6 characters")
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	}
	hasLetter := regexp.MustCompile(`[A-Za-z]`).MatchString(password)
	hasDigit := regexp.MustCompile(`\d`).MatchString(password)
	if !hasLetter || !hasDigit {
<<<<<<< HEAD
		return ErrInvalidPasswordComplexity
=======
		return errors.New("password must contain at least one letter and one number")
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	}
	return nil
}

// Activate marks the user as active
func (u *User) Activate() error {
	if u.IsActive {
<<<<<<< HEAD
		return nil // No error if already active
=======
		return errors.New("user is already active")
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	}
	u.IsActive = true
	u.UpdatedAt = time.Now()
	return nil
}

// Deactivate marks the user as inactive
func (u *User) Deactivate() error {
	if !u.IsActive {
<<<<<<< HEAD
		return nil // No error if already inactive
=======
		return errors.New("user is already inactive")
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
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
<<<<<<< HEAD
		return ErrEmailUnchanged
=======
		return errors.New("new email must be different from current email")
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	}

	u.Email = newEmail
	u.UpdatedAt = time.Now()
	return nil
}

// UpdateRole updates the user's role with validation
<<<<<<< HEAD
func (u *User) UpdateRole(newRole Role) error {
=======
func (u *User) UpdateRole(newRole string) error {
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	if !isValidRole(newRole) {
		return ErrInvalidRole
	}

	if newRole == u.Role {
<<<<<<< HEAD
		return ErrRoleUnchanged
	}

	u.Role = newRole
=======
		return errors.New("new role must be different from current role")
	}

	u.Role = newRole
	u.UpdatedAt = time.Now()
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	return nil
}

// isValidEmail checks if email format is valid
func isValidEmail(email string) error {
<<<<<<< HEAD
	if len(strings.TrimSpace(email)) == 0 {
=======
	if len(email) == 0 {
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
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
<<<<<<< HEAD
func isValidRole(role Role) bool {
	validRoles := map[Role]bool{
		Role_Admin:   true,
		Role_Student: true,
=======
func isValidRole(role string) bool {
	validRoles := map[string]bool{
		RoleAdmin:   true,
		RoleStudent: true,
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
	}
	return validRoles[role]
}

// ValidRoles returns a list of valid roles
<<<<<<< HEAD
func ValidRoles() []Role {
	return []Role{Role_Admin, Role_Student}
=======
func ValidRoles() []string {
	return []string{RoleAdmin, RoleStudent}
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
}

// Roles returns the model.Roles enum values
func Roles() []model.Roles {
	return model.RolesAllValues
}

<<<<<<< HEAD
func ValidateRoleAgainstEmail(role Role, email string) error {
	if role == Role_Admin && !strings.HasSuffix(email, "@uwi.edu") {
		return errors.New("admin email must end with @uwi.edu")
	} else if role == Role_Student && !strings.HasSuffix(email, "@my.uwi.edu") {
=======
func ValidateRoleAgainstEmail(role, email string) error {
	if role == RoleAdmin && !strings.HasSuffix(email, "@uwi.edu") {
		return errors.New("admin email must end with @uwi.edu")
	} else if role == RoleStudent && !strings.HasSuffix(email, "@my.uwi.edu") {
>>>>>>> d39032e56c3bb20da5580468a51cbead1422e689
		return errors.New("student email must end with @my.uwi.edu")
	}
	return nil
}

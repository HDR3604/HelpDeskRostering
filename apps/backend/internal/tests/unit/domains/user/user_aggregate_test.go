package user_test

import (
	"testing"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/errors"
	"github.com/stretchr/testify/suite"
)

type UserAggregateTestSuite struct {
	suite.Suite
}

func TestUserAggregateTestSuite(t *testing.T) {
	suite.Run(t, new(UserAggregateTestSuite))
}

type Role string

const (
	Role_Admin   Role = "admin"
	Role_Student Role = "student"
)

var RoleValues = []Role{Role_Admin, Role_Student}

// TestNewUser_Success tests creating a valid user
func TestNewUser_Success(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		password string
		role     Role
	}{
		{
			name:     "create admin user",
			email:    "admin@uwi.edu",
			password: "SecureP@ss123",
			role:     Role_Admin,
		},
		{
			name:     "create student user",
			email:    "student@my.uwi.edu",
			password: "StudentP@ss789",
			role:     Role_Student,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u, err := aggregate.NewUser(tt.email, tt.password, aggregate.Role(tt.role))

			if err != nil {
				t.Errorf("NewUser() error = %v, want nil", err)
				return
			}

			if u == nil {
				t.Error("NewUser() returned nil user")
				return
			}

			if u.Email != tt.email {
				t.Errorf("Email = %v, want %v", u.Email, tt.email)
			}
			if u.Password != tt.password {
				t.Errorf("Password = %v, want %v", u.Password, tt.password)
			}
			if u.Role != aggregate.Role(tt.role) {
				t.Errorf("Role = %v, want %v", u.Role, tt.role)
			}
			if !u.IsActive {
				t.Error("IsActive = false, want true")
			}
		})
	}
}

// TestNewUser_InvalidEmail tests email validation
func TestNewUser_InvalidEmail(t *testing.T) {
	tests := []struct {
		name  string
		email string
	}{
		{"empty email", ""},
		{"no @ symbol", "invalidemail.com"},
		{"no domain", "invalid@"},
		{"no local part", "@my.uwi.edu"},
		{"spaces in email", "invalid email@my.uwi.edu"},
		{"missing tld", "invalid@my.uwi"},
		{"invalid domain", "email@example.com"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u, err := aggregate.NewUser(tt.email, "ValidP@ss123!", aggregate.Role_Student)

			if err != errors.ErrInvalidEmail {
				t.Errorf("NewUser() error = %v, want %v", err, errors.ErrInvalidEmail)
			}
			if u != nil {
				t.Error("NewUser() returned non-nil user for invalid email")
			}
		})
	}
}

// TestNewUser_InvalidRole tests role validation
func TestNewUser_InvalidRole(t *testing.T) {
	tests := []struct {
		name string
		role string
	}{
		{"unknown role", "unknown"},
		{"empty role", ""},
		{"invalid role", "superadmin"},
		{"case sensitive role", "Admin"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u, err := aggregate.NewUser("valid@my.uwi.edu", "ValidP@ss123!", aggregate.Role(tt.role))

			if err != errors.ErrInvalidRole {
				t.Errorf("NewUser() error = %v, want %v", err, errors.ErrInvalidRole)
			}
			if u != nil {
				t.Error("NewUser() returned non-nil user for invalid role")
			}
		})
	}
}

// TestNewUser_InvalidPassword tests password validation
func TestNewUser_InvalidPassword(t *testing.T) {
	tests := []struct {
		name     string
		password string
		wantErr  error
	}{
		{"empty password", "", errors.ErrInvalidPasswordLength},
		{"too short", "P@ss1!", errors.ErrInvalidPasswordLength},
		{"seven chars", "P@ssw0r", errors.ErrInvalidPasswordLength},
		{"no uppercase", "p@ssw0rd", errors.ErrInvalidPasswordComplexity},
		{"no lowercase", "P@SSW0RD", errors.ErrInvalidPasswordComplexity},
		{"no digit", "P@ssword", errors.ErrInvalidPasswordComplexity},
		{"no special char", "Passw0rd", errors.ErrInvalidPasswordComplexity},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u, err := aggregate.NewUser("valid@my.uwi.edu", tt.password, aggregate.Role_Student)

			if err != tt.wantErr {
				t.Errorf("NewUser(%q) error = %v, want %v", tt.password, err, tt.wantErr)
			}
			if u != nil {
				t.Error("NewUser() returned non-nil user for invalid password")
			}
		})
	}
}

// TestNewUser_MinimalValidPassword tests the minimum valid password (8 chars)
func TestNewUser_MinimalValidPassword(t *testing.T) {
	u, err := aggregate.NewUser("valid@my.uwi.edu", "P@ssw0rd", aggregate.Role_Student)
	if err != nil {
		t.Errorf("NewUser() error = %v, want nil for minimal valid password", err)
	}
	if u == nil {
		t.Error("NewUser() returned nil for valid minimal password")
	}
}

// TestActivate_Success tests activating an inactive user
func TestActivate_Success(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}
	u.IsActive = false

	err = u.Activate()

	if err != nil {
		t.Errorf("Activate() error = %v, want nil", err)
	}
	if !u.IsActive {
		t.Error("Activate() - user is not active after activation")
	}
}

// TestActivate_AlreadyActive tests activating an already active user
func TestActivate_AlreadyActive(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.Activate()

	if err == nil {
		return // No error expected if already active
	}
}

// TestDeactivate_Success tests deactivating an active user
func TestDeactivate_Success(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.Deactivate()

	if err != nil {
		t.Errorf("Deactivate() error = %v, want nil", err)
	}
	if u.IsActive {
		t.Error("Deactivate() - user is still active after deactivation")
	}
}

// TestDeactivate_AlreadyInactive tests deactivating an already inactive user
func TestDeactivate_AlreadyInactive(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}
	u.IsActive = false

	err = u.Deactivate()

	if err == nil {
		return // No error expected if already inactive
	}
}

// TestUpdateEmail_Success tests updating email with valid new email
func TestUpdateEmail_Success(t *testing.T) {
	u, err := aggregate.NewUser("old@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}
	newEmail := "new@my.uwi.edu"

	err = u.UpdateEmail(newEmail)

	if err != nil {
		t.Errorf("UpdateEmail() error = %v, want nil", err)
	}
	if u.Email != newEmail {
		t.Errorf("Email = %v, want %v", u.Email, newEmail)
	}
}

// TestUpdateEmail_InvalidEmail tests updating to invalid email
func TestUpdateEmail_InvalidEmail(t *testing.T) {
	u, err := aggregate.NewUser("old@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateEmail("invalid-email")

	if err != errors.ErrInvalidEmail {
		t.Errorf("UpdateEmail() error = %v, want %v", err, errors.ErrInvalidEmail)
	}
	if u.Email != "old@my.uwi.edu" {
		t.Error("Email was changed despite invalid update")
	}
}

// TestUpdateEmail_SameEmail tests updating to same email
func TestUpdateEmail_SameEmail(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateEmail("test@my.uwi.edu")

	if err == nil {
		t.Error("UpdateEmail() error = nil, want error for same email")
	}
}

// TestUpdateRole_Success tests updating role with valid new role
func TestUpdateRole_Success(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}
	newRole := aggregate.Role_Admin

	err = u.UpdateRole(newRole)

	if err != nil {
		t.Errorf("UpdateRole() error = %v, want nil", err)
	}
	if u.Role != newRole {
		t.Errorf("Role = %v, want %v", u.Role, newRole)
	}
}

// TestUpdateRole_InvalidRole tests updating to invalid role
func TestUpdateRole_InvalidRole(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateRole("superadmin")

	if err != errors.ErrInvalidRole {
		t.Errorf("UpdateRole() error = %v, want %v", err, errors.ErrInvalidRole)
	}
	if u.Role != aggregate.Role_Student {
		t.Error("Role was changed despite invalid update")
	}
}

// TestUpdateRole_SameRole tests updating to same role
func TestUpdateRole_SameRole(t *testing.T) {
	u, err := aggregate.NewUser("test@my.uwi.edu", "ValidP@ss123!", aggregate.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateRole(aggregate.Role_Student)

	if err == nil {
		t.Error("UpdateRole() error = nil, want error for same role")
	}
}

// TestValidRoles tests the ValidRoles function
func TestValidRoles(t *testing.T) {
	roles := aggregate.ValidRoles()

	expectedLen := 2
	if len(roles) != expectedLen {
		t.Errorf("ValidRoles() returned %d roles, want %d", len(roles), expectedLen)
	}

	expectedRoles := map[Role]bool{
		Role_Admin:   true,
		Role_Student: true,
	}

	for _, role := range roles {
		if !expectedRoles[Role(role)] {
			t.Errorf("ValidRoles() returned unexpected role: %v", role)
		}
	}
}


package user_test

import (
	"testing"
	"time"

	"github.com/HDR3604/HelpDeskApp/internal/domain/user"
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
			password: "SecurePassword123",
			role:     Role_Admin,
		},
		{
			name:     "create student user",
			email:    "student@my.uwi.edu",
			password: "StudentPassword789",
			role:     Role_Student,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u, err := user.NewUser(tt.email, tt.password, user.Role(tt.role))

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
			if u.Role != user.Role(tt.role) {
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
			u, err := user.NewUser(tt.email, "ValidPassword123", user.Role_Student)

			if err != user.ErrInvalidEmail {
				t.Errorf("NewUser() error = %v, want %v", err, user.ErrInvalidEmail)
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
			u, err := user.NewUser("valid@my.uwi.edu", "ValidPassword123", user.Role(tt.role))

			if err != user.ErrInvalidRole {
				t.Errorf("NewUser() error = %v, want %v", err, user.ErrInvalidRole)
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
	}{
		{"empty password", ""},
		{"short password", "F1234"},
		{"minimal password", "P12345"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.password == "P12345" {
				// Minimal valid password should succeed
				u, err := user.NewUser("valid@my.uwi.edu", tt.password, user.Role_Student)
				if err != nil {
					t.Errorf("NewUser() error = %v, want nil for 6-char password", err)
				}
				if u == nil {
					t.Error("NewUser() returned nil for valid 6-char password")
				}
				return
			}

			u, err := user.NewUser("valid@my.uwi.edu", tt.password, user.Role_Student)

			if err == nil {
				t.Errorf("NewUser() error = nil, want error for password %q", tt.password)
			}
			if u != nil {
				t.Error("NewUser() returned non-nil user for invalid password")
			}
		})
	}
}

// TestActivate_Success tests activating an inactive user
func TestActivate_Success(t *testing.T) {
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
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
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
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
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
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
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
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
	u, err := user.NewUser("old@my.uwi.edu", "ValidPassword123", user.Role_Student)
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
	u, err := user.NewUser("old@my.uwi.edu", "ValidPassword123", user.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateEmail("invalid-email")

	if err != user.ErrInvalidEmail {
		t.Errorf("UpdateEmail() error = %v, want %v", err, user.ErrInvalidEmail)
	}
	if u.Email != "old@my.uwi.edu" {
		t.Error("Email was changed despite invalid update")
	}
}

// TestUpdateEmail_SameEmail tests updating to same email
func TestUpdateEmail_SameEmail(t *testing.T) {
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
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
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}
	newRole := user.Role_Admin

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
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateRole("superadmin")

	if err != user.ErrInvalidRole {
		t.Errorf("UpdateRole() error = %v, want %v", err, user.ErrInvalidRole)
	}
	if u.Role != user.Role_Student {
		t.Error("Role was changed despite invalid update")
	}
}

// TestUpdateRole_SameRole tests updating to same role
func TestUpdateRole_SameRole(t *testing.T) {
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}

	err = u.UpdateRole(user.Role_Student)

	if err == nil {
		t.Error("UpdateRole() error = nil, want error for same role")
	}
}

// TestValidRoles tests the ValidRoles function
func TestValidRoles(t *testing.T) {
	roles := user.ValidRoles()

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

// TestUserTimestamps_UpdatedOnChange tests that UpdatedAt changes when user is modified
func TestUserTimestamps_UpdatedOnChange(t *testing.T) {
	u, err := user.NewUser("test@my.uwi.edu", "ValidPassword123", user.Role_Student)
	if err != nil {
		t.Fatalf("NewUser() error = %v", err)
	}
	originalUpdatedAt := u.UpdatedAt

	// Sleep to ensure time difference
	time.Sleep(1 * time.Millisecond)

	u.UpdateEmail("new@my.uwi.edu")

	if u.UpdatedAt.Equal(originalUpdatedAt) {
		t.Error("UpdatedAt was not changed after email update")
	}
	if u.UpdatedAt.Before(originalUpdatedAt) {
		t.Error("UpdatedAt went backwards after email update")
	}
}

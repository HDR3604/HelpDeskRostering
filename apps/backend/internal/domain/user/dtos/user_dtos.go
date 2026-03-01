package dtos

import (
	"github.com/HDR3604/HelpDeskApp/internal/domain/user/aggregate"
)

type CreateUserRequest struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Email     string `json:"email"`
	Password  string `json:"password"`
	Role      string `json:"role"`
}

type UpdateUserRequest struct {
	Email    *string `json:"email"`
	Role     *string `json:"role"`
	IsActive *bool   `json:"is_active"`
}

type UserResponse struct {
	UserID          string  `json:"user_id"`
	FirstName       string  `json:"first_name"`
	LastName        string  `json:"last_name"`
	Email           string  `json:"email"`
	Role            string  `json:"role"`
	IsActive        bool    `json:"is_active"`
	CreatedAt       string  `json:"created_at"`
	UpdatedAt       *string `json:"updated_at,omitempty"`
	EmailVerifiedAt *string `json:"email_verified_at,omitempty"`
}

func UserToResponse(u *aggregate.User) UserResponse {
	resp := UserResponse{
		UserID:    u.ID.String(),
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Email:     u.Email,
		Role:      string(u.Role),
		IsActive:  u.IsActive,
	}
	if u.CreatedAt != nil {
		resp.CreatedAt = u.CreatedAt.Format("2006-01-02 15:04:05")
	}
	if u.EmailVerifiedAt != nil {
		formatted := u.EmailVerifiedAt.Format("2006-01-02 15:04:05")
		resp.EmailVerifiedAt = &formatted
	}
	if u.UpdatedAt != nil {
		formatted := u.UpdatedAt.Format("2006-01-02 15:04:05")
		resp.UpdatedAt = &formatted
	}
	return resp
}

func UsersToResponse(users []*aggregate.User) []UserResponse {
	responses := make([]UserResponse, len(users))
	for i, u := range users {
		responses[i] = UserToResponse(u)
	}
	return responses
}

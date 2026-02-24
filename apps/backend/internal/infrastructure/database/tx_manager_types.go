package database

import "context"

type AuthContext struct {
	UserID    string  // app.current_user_id
	StudentID *string // app.current_student_id
	Role      string  // app.current_role ("admin" or "student")
}

type contextKey string

const authContextKey contextKey = "auth_context"

func WithAuthContext(ctx context.Context, ac AuthContext) context.Context {
	return context.WithValue(ctx, authContextKey, ac)
}

func AuthContextFromContext(ctx context.Context) (AuthContext, bool) {
	ac, ok := ctx.Value(authContextKey).(AuthContext)
	return ac, ok
}

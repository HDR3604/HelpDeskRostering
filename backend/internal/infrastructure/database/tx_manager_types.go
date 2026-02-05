package database

type AuthContext struct {
	UserID    string  // app.current_user_id
	StudentID *string // app.current_student_id
	Role      string  // app.current_role ("admin" or "student")
}

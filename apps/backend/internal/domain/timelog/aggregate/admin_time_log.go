package aggregate

// AdminTimeLog extends TimeLog with student details for admin views.
type AdminTimeLog struct {
	TimeLog
	StudentName  string
	StudentEmail string
	StudentPhone string
}

import { useState } from "react"
import { toast } from "sonner"
import { createFileRoute } from "@tanstack/react-router"
import { SummaryCards } from "../components/dashboard/summary-cards"
import { StudentApplicationsTable } from "../components/dashboard/student-applications-table"
import { ActiveScheduleCard } from "../components/dashboard/active-schedule-card"
import { MiniWeeklySchedule } from "../components/dashboard/mini-weekly-schedule"
import { StudentDashboard } from "../components/student-dashboard/student-dashboard"
import { MOCK_STUDENTS, MOCK_ACTIVE_SCHEDULE, MOCK_SHIFT_TEMPLATES, STUDENT_NAME_MAP } from "../lib/mock-data"
import { getApplicationStatus } from "../types/student"
import { useUser } from "../hooks/use-user"
import type { Student } from "../types/student"

export const Route = createFileRoute("/")({
  component: DashboardPage,
})

function DashboardPage() {
  const { role } = useUser()

  if (role === "student") {
    return <StudentDashboard />
  }

  return <AdminDashboard />
}

function AdminDashboard() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS)

  const pendingCount = students.filter((s) => getApplicationStatus(s) === "pending").length
  const acceptedCount = students.filter((s) => getApplicationStatus(s) === "accepted").length
  const scheduledThisWeekCount = new Set(
    MOCK_ACTIVE_SCHEDULE.assignments.map((a) => a.assistant_id)
  ).size

  function handleAccept(studentId: number) {
    const student = students.find((s) => s.student_id === studentId)
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, accepted_at: new Date().toISOString(), rejected_at: null }
          : s
      )
    )
    toast.success(`${student?.first_name} ${student?.last_name} accepted`)
  }

  function handleReject(studentId: number) {
    const student = students.find((s) => s.student_id === studentId)
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, rejected_at: new Date().toISOString(), accepted_at: null }
          : s
      )
    )
    toast.error(`${student?.first_name} ${student?.last_name} rejected`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Overview of student applications, scheduling, and helpdesk operations.
        </p>
      </div>

      {/* Summary stats */}
      <SummaryCards
        pendingCount={pendingCount}
        acceptedCount={acceptedCount}
        scheduledThisWeekCount={scheduledThisWeekCount}
        totalCount={students.length}
      />

      {/* Applications table — full width */}
      <StudentApplicationsTable
        students={students}
        onAccept={handleAccept}
        onReject={handleReject}
      />

      {/* Schedule section — side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ActiveScheduleCard schedule={MOCK_ACTIVE_SCHEDULE} />
        <MiniWeeklySchedule
          schedule={MOCK_ACTIVE_SCHEDULE}
          shiftTemplates={MOCK_SHIFT_TEMPLATES}
          studentNames={STUDENT_NAME_MAP}
        />
      </div>
    </div>
  )
}

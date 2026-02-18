import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { SummaryCards } from "../components/dashboard/summary-cards"
import { StudentApplicationsTable } from "../components/dashboard/student-applications-table"
import { ActiveScheduleCard } from "../components/dashboard/active-schedule-card"
import { MiniWeeklySchedule } from "../components/dashboard/mini-weekly-schedule"
import { MOCK_STUDENTS, MOCK_ACTIVE_SCHEDULE, MOCK_SHIFT_TEMPLATES, STUDENT_NAME_MAP } from "../lib/mock-data"
import { getApplicationStatus } from "../types/student"
import type { Student } from "../types/student"

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
})

function DashboardPage() {
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS)

  const pendingCount = students.filter((s) => getApplicationStatus(s) === "pending").length
  const acceptedCount = students.filter((s) => getApplicationStatus(s) === "accepted").length
  const scheduledThisWeekCount = new Set(
    MOCK_ACTIVE_SCHEDULE.assignments.map((a) => a.assistant_id)
  ).size

  function handleAccept(studentId: number) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, accepted_at: new Date().toISOString(), rejected_at: null }
          : s
      )
    )
  }

  function handleReject(studentId: number) {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId
          ? { ...s, rejected_at: new Date().toISOString(), accepted_at: null }
          : s
      )
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>

      <SummaryCards
        pendingCount={pendingCount}
        acceptedCount={acceptedCount}
        scheduledThisWeekCount={scheduledThisWeekCount}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <StudentApplicationsTable
            students={students}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </div>
        <div className="space-y-6 lg:col-span-2">
          <ActiveScheduleCard schedule={MOCK_ACTIVE_SCHEDULE} />
          <MiniWeeklySchedule
            schedule={MOCK_ACTIVE_SCHEDULE}
            shiftTemplates={MOCK_SHIFT_TEMPLATES}
            studentNames={STUDENT_NAME_MAP}
          />
        </div>
      </div>
    </div>
  )
}

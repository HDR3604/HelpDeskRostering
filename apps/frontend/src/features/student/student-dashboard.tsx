import { useUser } from "@/hooks/use-user"
import { MOCK_ACTIVE_SCHEDULE, MOCK_SHIFT_TEMPLATES, MOCK_TIME_LOGS } from "@/lib/mock-data"
import { getApplicationStatus } from "@/types/student"
import { ApplicationStatusBanner } from "./components/application-status-banner"
import { StudentSummaryCards } from "./components/student-summary-cards"
import { NextShiftCard } from "./components/next-shift-card"
import { WeekSummaryCard } from "./components/week-summary-card"
import { StudentWeeklySchedule } from "./components/student-weekly-schedule"

export function StudentDashboard() {
  const { currentStudent, currentStudentId } = useUser()

  const myAssignments = MOCK_ACTIVE_SCHEDULE.assignments.filter(
    (a) => a.assistant_id === currentStudentId
  )

  const isAccepted = getApplicationStatus(currentStudent) === "accepted"

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">My Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {currentStudent.first_name}. Here is your helpdesk overview.
        </p>
      </div>

      <ApplicationStatusBanner student={currentStudent} />

      <StudentSummaryCards
        student={currentStudent}
        assignments={myAssignments}
        shiftTemplates={MOCK_SHIFT_TEMPLATES}
        timeLogs={MOCK_TIME_LOGS}
      />

      {isAccepted && myAssignments.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">This Week's Schedule</h2>
            <p className="text-sm text-muted-foreground">{MOCK_ACTIVE_SCHEDULE.title}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <NextShiftCard
              assignments={myAssignments}
              shiftTemplates={MOCK_SHIFT_TEMPLATES}
            />
            <WeekSummaryCard
              assignments={myAssignments}
              schedule={MOCK_ACTIVE_SCHEDULE}
            />
          </div>

          <StudentWeeklySchedule
            assignments={myAssignments}
            shiftTemplates={MOCK_SHIFT_TEMPLATES}
            schedule={MOCK_ACTIVE_SCHEDULE}
          />
        </div>
      )}
    </div>
  )
}

import { useUser } from "@/hooks/use-user"
import { MOCK_ACTIVE_SCHEDULE, MOCK_SHIFT_TEMPLATES } from "@/lib/mock-data"
import { NextShiftCard } from "./next-shift-card"
import { WeekSummaryCard } from "./week-summary-card"
import { StudentWeeklySchedule } from "./student-weekly-schedule"

export function StudentDashboard() {
  const { currentStudent, currentStudentId } = useUser()

  const myAssignments = MOCK_ACTIVE_SCHEDULE.assignments.filter(
    (a) => a.assistant_id === currentStudentId
  )

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Schedule</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome back, {currentStudent.first_name}. Here are your helpdesk shifts for the week.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NextShiftCard
          assignments={myAssignments}
          shiftTemplates={MOCK_SHIFT_TEMPLATES}
        />
        <WeekSummaryCard
          assignments={myAssignments}
          schedule={MOCK_ACTIVE_SCHEDULE}
        />
      </div>

      {/* Weekly schedule — full width */}
      <StudentWeeklySchedule
        assignments={myAssignments}
        shiftTemplates={MOCK_SHIFT_TEMPLATES}
      />
    </div>
  )
}

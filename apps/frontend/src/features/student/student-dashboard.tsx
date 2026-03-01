import { Loader2 } from 'lucide-react'
import {
    MOCK_ACTIVE_SCHEDULE,
    MOCK_SHIFT_TEMPLATES,
    MOCK_TIME_LOGS,
} from '@/lib/mock-data'
import { useMyStudentProfile } from '@/lib/queries/students'
import { getApplicationStatus } from '@/types/student'
import { ApplicationStatusBanner } from './components/application-status-banner'
import { StudentSummaryCards } from './components/student-summary-cards'
import { NextShiftCard } from './components/next-shift-card'
import { WeekSummaryCard } from './components/week-summary-card'
import { StudentWeeklySchedule } from './components/student-weekly-schedule'

export function StudentDashboard() {
    const profileQuery = useMyStudentProfile()
    const student = profileQuery.data

    if (profileQuery.isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!student) {
        return (
            <div className="mx-auto max-w-7xl py-10 text-center text-muted-foreground">
                No student profile found. Please apply first.
            </div>
        )
    }

    const studentId = String(student.student_id)

    const myAssignments = (
        Array.isArray(MOCK_ACTIVE_SCHEDULE.assignments)
            ? MOCK_ACTIVE_SCHEDULE.assignments
            : []
    ).filter((a) => a.assistant_id === studentId)

    const isAccepted = getApplicationStatus(student) === 'accepted'

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    My Dashboard
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome back, {student.first_name}. Here is your helpdesk
                    overview.
                </p>
            </div>

            <ApplicationStatusBanner student={student} />

            <StudentSummaryCards
                student={student}
                assignments={myAssignments}
                shiftTemplates={MOCK_SHIFT_TEMPLATES}
                timeLogs={MOCK_TIME_LOGS}
            />

            {isAccepted && myAssignments.length > 0 && (
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold">
                            This Week's Schedule
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            {MOCK_ACTIVE_SCHEDULE.title}
                        </p>
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

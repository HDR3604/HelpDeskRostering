import { useMemo } from 'react'
import { CalendarDays, Clock } from 'lucide-react'
import { useMyStudentProfile } from '@/lib/queries/students'
import { useActiveSchedule } from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { getApplicationStatus } from '@/types/student'
import { ApplicationStatusBanner } from './components/application-status-banner'
import { WeekSummaryCard } from './components/week-summary-card'
import { NextShiftCard } from './components/next-shift-card'
import { StudentWeeklySchedule } from './components/student-weekly-schedule'
import { StudentDashboardSkeleton } from './skeletons/student-dashboard-skeleton'

export function StudentDashboard() {
    const profileQuery = useMyStudentProfile()
    const student = profileQuery.data

    const status = student ? getApplicationStatus(student) : null
    const isAccepted = status === 'accepted'

    const scheduleQuery = useActiveSchedule()
    const shiftTemplatesQuery = useShiftTemplates()

    const schedule = scheduleQuery.data
    const shiftTemplates = shiftTemplatesQuery.data ?? []

    // Filter assignments for the current student
    // assistant_id may arrive as string or number depending on JSON storage
    const myAssignments = useMemo(() => {
        if (!schedule?.assignments || !student) return []
        const studentIdStr = String(student.student_id)
        return schedule.assignments.filter(
            (a) => String(a.assistant_id) === studentIdStr,
        )
    }, [schedule, student])

    const hasSchedule = isAccepted && schedule && myAssignments.length > 0

    if (profileQuery.isLoading || (isAccepted && scheduleQuery.isLoading)) {
        return <StudentDashboardSkeleton />
    }

    if (!student) {
        return null
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    My Dashboard
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Welcome back, {student.first_name}.
                </p>
            </div>

            <ApplicationStatusBanner student={student} />

            {hasSchedule ? (
                <>
                    <div className="grid gap-4 md:grid-cols-2">
                        <WeekSummaryCard
                            assignments={myAssignments}
                            schedule={schedule}
                        />
                        <NextShiftCard
                            assignments={myAssignments}
                            shiftTemplates={shiftTemplates}
                        />
                    </div>
                    <StudentWeeklySchedule
                        assignments={myAssignments}
                        shiftTemplates={shiftTemplates}
                        schedule={schedule}
                    />
                </>
            ) : (
                isAccepted && (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-24 text-center">
                        <div className="relative">
                            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
                                <CalendarDays className="size-8 text-primary" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-background bg-muted">
                                <Clock className="size-3.5 text-muted-foreground" />
                            </div>
                        </div>
                        <h2 className="mt-6 text-lg font-semibold">
                            No schedule assigned yet
                        </h2>
                        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
                            Your shifts, schedules, and time logs will appear
                            here once an administrator assigns you to a roster.
                        </p>
                    </div>
                )
            )}
        </div>
    )
}

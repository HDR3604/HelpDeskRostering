import { useMemo } from 'react'
import { Link } from '@tanstack/react-router'
import {
    CalendarDays,
    Clock,
    Layers,
    Timer,
    ChevronRight,
    CircleDot,
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useMyStudentProfile } from '@/lib/queries/students'
import { useActiveSchedule } from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { useClockInStatus } from '@/lib/queries/time-logs'
import { getApplicationStatus } from '@/types/student'
import { ApplicationStatusBanner } from './components/application-status-banner'
import { NextShiftCard } from './components/next-shift-card'
import { StudentWeeklySchedule } from './components/student-weekly-schedule'
import { StudentDashboardSkeleton } from './skeletons/student-dashboard-skeleton'
import { ALL_DAYS_SHORT, getTodayWeekdayIndex } from '@/lib/constants'
import { formatHour, getScheduledHours, formatDateRange } from '@/lib/format'
import { getNextAssignment } from './utils'

function getGreeting(): string {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

export function StudentDashboard() {
    const profileQuery = useMyStudentProfile()
    const student = profileQuery.data

    const status = student ? getApplicationStatus(student) : null
    const isAccepted = status === 'accepted'

    const scheduleQuery = useActiveSchedule()
    const shiftTemplatesQuery = useShiftTemplates()
    const clockStatusQuery = useClockInStatus()

    const schedule = scheduleQuery.data
    const shiftTemplates = shiftTemplatesQuery.data ?? []
    const clockStatus = clockStatusQuery.data

    const myAssignments = useMemo(() => {
        if (!schedule?.assignments || !student) return []
        const studentIdStr = String(student.student_id)
        return schedule.assignments.filter(
            (a) => String(a.assistant_id) === studentIdStr,
        )
    }, [schedule, student])

    const hasSchedule = isAccepted && schedule && myAssignments.length > 0

    const today = getTodayWeekdayIndex()
    const todayShiftCount = myAssignments.filter(
        (a) => a.day_of_week === today,
    ).length
    const totalShifts = myAssignments.length
    const scheduledHours = getScheduledHours(myAssignments)
    const nextAssignment = getNextAssignment(myAssignments)
    const nextTemplate = nextAssignment
        ? shiftTemplates.find((t) => t.id === nextAssignment.shift_id)
        : null
    const isClockedIn = clockStatus?.is_clocked_in ?? false

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
                    {getGreeting()}, {student.first_name}
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Here's an overview of your schedule and shifts.
                </p>
            </div>

            <ApplicationStatusBanner student={student} />

            {/* Clock-in status banner — only for accepted students */}
            {isAccepted && (
                <Link
                    to="/clock"
                    className="group block rounded-xl border bg-card transition-colors hover:bg-muted/50"
                >
                    <div className="flex items-center gap-4 px-5 py-4">
                        <div
                            className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                                isClockedIn
                                    ? 'bg-emerald-500/15 text-emerald-500'
                                    : 'bg-muted text-muted-foreground',
                            )}
                        >
                            <CircleDot className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">
                                    {isClockedIn
                                        ? 'You are currently on shift'
                                        : 'You are not clocked in'}
                                </p>
                                {isClockedIn && (
                                    <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        </span>
                                        Active
                                    </Badge>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isClockedIn && clockStatus?.current_shift
                                    ? clockStatus.current_shift.name
                                    : 'Scan the QR code at the help desk to clock in'}
                            </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </div>
                </Link>
            )}

            {hasSchedule ? (
                <>
                    {/* Stat cards */}
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                        <StatItem
                            icon={CalendarDays}
                            iconClassName="bg-blue-500/10 text-blue-500"
                            label="Today"
                            value={
                                todayShiftCount > 0
                                    ? `${todayShiftCount} shift${todayShiftCount > 1 ? 's' : ''}`
                                    : 'No shifts'
                            }
                        />
                        <StatItem
                            icon={Layers}
                            iconClassName="bg-violet-500/10 text-violet-500"
                            label="This Week"
                            value={`${totalShifts} shifts`}
                        />
                        <StatItem
                            icon={Timer}
                            iconClassName="bg-amber-500/10 text-amber-500"
                            label="Scheduled Hours"
                            value={`${scheduledHours}h`}
                        />
                        <StatItem
                            icon={Clock}
                            iconClassName="bg-cyan-500/10 text-cyan-500"
                            label="Next Shift"
                            value={
                                nextAssignment
                                    ? `${ALL_DAYS_SHORT[nextAssignment.day_of_week]} ${formatHour(nextAssignment.start)}`
                                    : 'None'
                            }
                            detail={nextTemplate?.name}
                        />
                    </div>

                    {/* Schedule info + next shift */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Schedule</CardTitle>
                                <CardDescription>
                                    {schedule.title}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CalendarDays className="h-4 w-4" />
                                    <span>
                                        {formatDateRange(
                                            schedule.effective_from,
                                            schedule.effective_to,
                                        )}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
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

function StatItem({
    icon: Icon,
    iconClassName,
    label,
    value,
    detail,
}: {
    icon: React.ElementType
    iconClassName: string
    label: string
    value: string
    detail?: string
}) {
    return (
        <Card className="gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
            <CardHeader className="flex flex-row items-center justify-between px-0 pb-0">
                <CardTitle className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {label}
                </CardTitle>
                <div
                    className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7',
                        iconClassName,
                    )}
                >
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="text-xl font-bold tracking-tight sm:text-2xl">
                    {value}
                </div>
                {detail && (
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                        {detail}
                    </p>
                )}
            </CardContent>
        </Card>
    )
}

import { Clock, CalendarCheck, CalendarClock, CircleDot } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'
import { MOCK_HOURS_WORKED, MOCK_MISSED_SHIFTS } from '@/lib/mock-data'
import { ALL_DAYS_SHORT } from '@/lib/constants'
import { formatHour, getScheduledHours } from '@/lib/format'
import { getNextAssignment } from '../utils'
import type { Student } from '@/types/student'
import type { Assignment } from '@/types/schedule'
import type { ShiftTemplate } from '@/types/shift-template'
import type { TimeLog } from '@/types/time-log'

interface StudentSummaryCardsProps {
    student: Student
    assignments: Assignment[]
    shiftTemplates: ShiftTemplate[]
    timeLogs: TimeLog[]
}

function formatDuration(ms: number): string {
    const totalMin = Math.floor(ms / 60_000)
    const hrs = Math.floor(totalMin / 60)
    const mins = totalMin % 60
    if (hrs > 0) return `${hrs}h ${mins}m`
    return `${mins}m`
}

export function StudentSummaryCards({
    student,
    assignments,
    shiftTemplates,
    timeLogs,
}: StudentSummaryCardsProps) {
    const fullName = `${student.first_name} ${student.last_name}`
    const hoursData = MOCK_HOURS_WORKED.find((h) => h.name === fullName)
    const shiftsData = MOCK_MISSED_SHIFTS.find((s) => s.name === fullName)
    const scheduledHours = getScheduledHours(assignments)
    const next = getNextAssignment(assignments)
    const template = next
        ? shiftTemplates.find((t) => t.id === next.shift_id)
        : null

    const hoursWorked = hoursData?.hours ?? 0
    const totalShifts = shiftsData?.total ?? 0
    const missedShifts = shiftsData?.missed ?? 0
    const completedShifts = totalShifts - missedShifts
    const attendanceRate =
        totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0
    const hoursPct =
        scheduledHours > 0
            ? Math.round((hoursWorked / scheduledHours) * 100)
            : 0

    const hasData = assignments.length > 0

    // Clock status: find the most recent time_log for this student
    const myLogs = timeLogs
        .filter((l) => l.student_id === student.student_id)
        .sort(
            (a, b) =>
                new Date(b.entry_at).getTime() - new Date(a.entry_at).getTime(),
        )
    const latestLog = myLogs[0] ?? null
    const isOnClock = !!latestLog && latestLog.exit_at === null

    let clockSubtitle: string
    if (isOnClock) {
        const elapsed = Date.now() - new Date(latestLog.entry_at).getTime()
        clockSubtitle = `Clocked in ${formatDuration(elapsed)} ago`
    } else if (latestLog?.exit_at) {
        const since = Date.now() - new Date(latestLog.exit_at).getTime()
        clockSubtitle = `Last clocked out ${formatDuration(since)} ago`
    } else if (next) {
        clockSubtitle = `Next: ${ALL_DAYS_SHORT[next.day_of_week]} ${formatHour(next.start)}`
    } else {
        clockSubtitle = 'No shifts scheduled'
    }

    const cards = [
        {
            title: 'Hours This Week',
            value: hasData ? `${hoursWorked} / ${scheduledHours}` : '—',
            subtitle: hasData ? `${hoursPct}% of scheduled hours` : '',
            icon: Clock,
            iconClassName: 'bg-blue-500/10 text-blue-500',
        },
        {
            title: 'Shifts Completed',
            value: hasData ? `${completedShifts} / ${totalShifts}` : '—',
            subtitle: hasData ? `${attendanceRate}% attendance` : '',
            icon: CalendarCheck,
            iconClassName: 'bg-emerald-500/10 text-emerald-500',
        },
        {
            title: 'Next Shift',
            value: next
                ? `${ALL_DAYS_SHORT[next.day_of_week]} ${formatHour(next.start)}`
                : '—',
            subtitle: template?.name ?? '',
            icon: CalendarClock,
            iconClassName: 'bg-violet-500/10 text-violet-500',
        },
        {
            title: 'Clock Status',
            value: isOnClock ? 'On Clock' : 'Off Clock',
            subtitle: clockSubtitle,
            icon: CircleDot,
            iconClassName: isOnClock
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-muted text-muted-foreground',
            href: '/clock',
        },
    ]

    return (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            {cards.map((card) => (
                <StatCard key={card.title} {...card} />
            ))}
        </div>
    )
}

import { lazy, Suspense, useMemo, Fragment } from 'react'
import {
    CalendarDays,
    LoaderCircle,
    Plus,
    Users,
    Clock,
    AlertTriangle,
    CheckCircle,
    BarChart3,
} from 'lucide-react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    LabelList,
    XAxis,
    YAxis,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { WEEKDAYS_SHORT, getTodayWeekdayIndex } from '@/lib/constants'
import { formatHour } from '@/lib/format'
import { STUDENT_COLORS } from './types'

const ScheduleTables = lazy(() =>
    import('./components/schedule-tables').then((m) => ({
        default: m.ScheduleTables,
    })),
)
import { getScheduleColumns } from './columns/schedule-columns'
import { ActiveScheduleCard } from './components/active-schedule-card'
import type { ScheduleResponse, Assignment } from '@/types/schedule'
import type { ShiftTemplate } from '@/types/shift-template'

function getScheduleStats(schedule: ScheduleResponse | null) {
    if (!schedule) {
        return { totalStudents: 0, totalAssignments: 0 }
    }
    const assignments = Array.isArray(schedule.assignments)
        ? schedule.assignments
        : []
    const studentSet = new Set(assignments.map((a) => a.assistant_id))
    return {
        totalStudents: studentSet.size,
        totalAssignments: assignments.length,
    }
}

interface ScheduleListViewProps {
    schedules: ScheduleResponse[]
    shiftTemplates: ShiftTemplate[]
    studentNames: Record<string, string>
    onCreateNew: () => void
    creatingSchedule?: boolean
    onOpenSchedule: (scheduleId: string) => void
    onRename: (schedule: ScheduleResponse) => void
    onSetActive: (schedule: ScheduleResponse) => void
    onDownload: (schedule: ScheduleResponse) => void
    onArchive: (schedule: ScheduleResponse) => void
    onUnarchive: (schedule: ScheduleResponse) => void
    onDeactivate: (schedule: ScheduleResponse) => void
    onNotify: (schedule: ScheduleResponse) => void
}

export function ScheduleListView({
    schedules,
    shiftTemplates,
    studentNames,
    onCreateNew,
    creatingSchedule,
    onOpenSchedule,
    onRename,
    onSetActive,
    onDownload,
    onArchive,
    onUnarchive,
    onDeactivate,
    onNotify,
}: ScheduleListViewProps) {
    const activeSchedule = schedules.find((s) => s.status === 'active') ?? null
    const stats = getScheduleStats(activeSchedule)
    const assignments = useMemo(
        () =>
            Array.isArray(activeSchedule?.assignments)
                ? activeSchedule.assignments
                : [],
        [activeSchedule],
    )

    const scheduleColumns = useMemo(
        () =>
            getScheduleColumns({
                onOpen: onOpenSchedule,
                onRename,
                onSetActive,
                onDownload,
                onArchive,
                onUnarchive,
            }),
        [
            onOpenSchedule,
            onRename,
            onSetActive,
            onDownload,
            onArchive,
            onUnarchive,
        ],
    )

    return (
        <div
            className="flex flex-col gap-6"
            style={{ minHeight: 'calc(100dvh - 3.5rem - 3rem)' }}
        >
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Schedule
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Create and manage weekly schedules.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={creatingSchedule}
                    onClick={onCreateNew}
                >
                    {creatingSchedule ? (
                        <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <Plus className="mr-1 h-3.5 w-3.5" />
                    )}
                    Create Schedule
                </Button>
            </div>

            {/* Active schedule */}
            {activeSchedule ? (
                <>
                    <ActiveScheduleCard
                        schedule={activeSchedule}
                        stats={stats}
                        onOpen={onOpenSchedule}
                        onRename={onRename}
                        onDownload={onDownload}
                        onArchive={onArchive}
                        onDeactivate={onDeactivate}
                        onNotify={onNotify}
                    />

                    {/* Insights row */}
                    <ScheduleInsights
                        assignments={assignments}
                        shiftTemplates={shiftTemplates}
                        studentNames={studentNames}
                    />

                    {/* Grid + charts */}
                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
                        <ScheduleOverview
                            schedule={activeSchedule}
                            shiftTemplates={shiftTemplates}
                            studentNames={studentNames}
                        />
                        <div className="flex flex-col gap-4">
                            <DailyCoverageChart assignments={assignments} />
                            <ShiftsPerStudentChart
                                assignments={assignments}
                                studentNames={studentNames}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
                        <p className="mt-3 text-sm text-muted-foreground">
                            No active schedule. Create one or activate an
                            existing schedule.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* All schedules management table */}
            <Suspense
                fallback={
                    <div className="flex items-center justify-center rounded-lg border py-16">
                        <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <ScheduleTables
                    schedules={schedules}
                    columns={scheduleColumns}
                    onOpenSchedule={onOpenSchedule}
                />
            </Suspense>
        </div>
    )
}

// --- Schedule insights ---

function ScheduleInsights({
    assignments,
    shiftTemplates,
    studentNames,
}: {
    assignments: Assignment[]
    shiftTemplates: ShiftTemplate[]
    studentNames: Record<string, string>
}) {
    const insights = useMemo(() => {
        if (assignments.length === 0) return null

        // Shifts per student
        const perStudent: Record<string, number> = {}
        for (const a of assignments) {
            perStudent[a.assistant_id] = (perStudent[a.assistant_id] ?? 0) + 1
        }
        const studentEntries = Object.entries(perStudent)
            .map(([id, count]) => ({ name: studentNames[id] || id, count }))
            .sort((a, b) => b.count - a.count)

        const mostShifts = studentEntries[0]
        const fewestShifts = studentEntries[studentEntries.length - 1]

        // Uncovered slots
        const coveredShiftIds = new Set(assignments.map((a) => a.shift_id))
        const activeTemplates = shiftTemplates.filter((t) => t.is_active)
        const uncoveredCount = activeTemplates.filter(
            (t) => !coveredShiftIds.has(t.id),
        ).length
        const totalSlots = activeTemplates.length
        const coveragePercent =
            totalSlots > 0
                ? Math.round(((totalSlots - uncoveredCount) / totalSlots) * 100)
                : 100

        // Unique students
        const studentCount = studentEntries.length

        return {
            studentCount,
            totalShifts: assignments.length,
            mostShifts,
            fewestShifts,
            isBalanced: mostShifts.count - fewestShifts.count <= 1,
            uncoveredCount,
            coveragePercent,
        }
    }, [assignments, shiftTemplates, studentNames])

    if (!insights) return null

    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <InsightItem
                icon={Users}
                iconClassName="bg-blue-500/10 text-blue-500"
                label="Students"
                value={String(insights.studentCount)}
            />
            <InsightItem
                icon={CalendarDays}
                iconClassName="bg-violet-500/10 text-violet-500"
                label="Total shifts"
                value={String(insights.totalShifts)}
            />
            <InsightItem
                icon={BarChart3}
                iconClassName="bg-amber-500/10 text-amber-500"
                label="Most shifts"
                value={insights.mostShifts.name.split(' ')[0]}
                detail={`${insights.mostShifts.count}`}
            />
            <InsightItem
                icon={Clock}
                iconClassName="bg-cyan-500/10 text-cyan-500"
                label="Fewest shifts"
                value={insights.fewestShifts.name.split(' ')[0]}
                detail={`${insights.fewestShifts.count}`}
            />
            <InsightItem
                icon={insights.uncoveredCount > 0 ? AlertTriangle : CheckCircle}
                iconClassName={
                    insights.uncoveredCount > 0
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                }
                label="Coverage"
                value={`${insights.coveragePercent}%`}
                detail={
                    insights.uncoveredCount > 0
                        ? `${insights.uncoveredCount} gaps`
                        : undefined
                }
            />
            <InsightItem
                icon={insights.isBalanced ? CheckCircle : AlertTriangle}
                iconClassName={
                    insights.isBalanced
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-amber-500/10 text-amber-500'
                }
                label="Balance"
                value={insights.isBalanced ? 'Even' : 'Uneven'}
            />
        </div>
    )
}

function InsightItem({
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
        <div className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3">
            <div
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    iconClassName,
                )}
            >
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="truncate text-sm font-semibold leading-tight">
                    {value}
                    {detail && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {detail}
                        </span>
                    )}
                </p>
            </div>
        </div>
    )
}

// --- Daily coverage chart ---

const coverageConfig = {
    staff: { label: 'Staff', color: 'var(--color-primary)' },
} satisfies ChartConfig

function DailyCoverageChart({ assignments }: { assignments: Assignment[] }) {
    const today = getTodayWeekdayIndex()
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

    const data = useMemo(() => {
        return dayNames.map((day, idx) => {
            const count = assignments.filter(
                (a) => a.day_of_week === idx,
            ).length
            return { day, shifts: count, isToday: idx === today }
        })
    }, [assignments, today])

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Daily Distribution</CardTitle>
                <CardDescription className="text-xs">
                    Shifts per day of the week
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={coverageConfig}
                    className="h-[140px] w-full"
                >
                    <BarChart data={data} barSize={28}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="day"
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            fontSize={11}
                            allowDecimals={false}
                            width={24}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent />}
                        />
                        <Bar dataKey="shifts" radius={[4, 4, 0, 0]}>
                            <LabelList
                                dataKey="shifts"
                                position="top"
                                className="fill-muted-foreground text-[10px]"
                            />
                            {data.map((entry) => (
                                <Cell
                                    key={entry.day}
                                    fill="var(--color-primary)"
                                    fillOpacity={entry.isToday ? 1 : 0.5}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

// --- Shifts per student chart ---

const shiftsConfig = {
    shifts: { label: 'Shifts', color: 'var(--color-primary)' },
} satisfies ChartConfig

function ShiftsPerStudentChart({
    assignments,
    studentNames,
}: {
    assignments: Assignment[]
    studentNames: Record<string, string>
}) {
    const data = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const a of assignments) {
            counts[a.assistant_id] = (counts[a.assistant_id] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([id, shifts]) => ({
                name: (studentNames[id] || id).split(' ')[0],
                shifts,
            }))
            .sort((a, b) => b.shifts - a.shifts)
    }, [assignments, studentNames])

    if (data.length === 0) return null

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Shift Load</CardTitle>
                <CardDescription className="text-xs">
                    Shifts assigned per student
                </CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer
                    config={shiftsConfig}
                    className="w-full"
                    style={{ height: Math.max(100, data.length * 32 + 20) }}
                >
                    <BarChart
                        data={data}
                        layout="vertical"
                        margin={{ left: 0 }}
                        barSize={18}
                    >
                        <CartesianGrid horizontal={false} />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tickLine={false}
                            tickMargin={8}
                            axisLine={false}
                            width={70}
                            fontSize={11}
                        />
                        <XAxis dataKey="shifts" type="number" hide />
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar
                            dataKey="shifts"
                            fill="var(--color-primary)"
                            fillOpacity={0.7}
                            radius={4}
                        >
                            <LabelList
                                dataKey="shifts"
                                position="right"
                                className="fill-foreground text-xs"
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

// --- Schedule overview (read-only weekly grid) ---

function ScheduleOverview({
    schedule,
    shiftTemplates,
    studentNames,
}: {
    schedule: ScheduleResponse
    shiftTemplates: ShiftTemplate[]
    studentNames: Record<string, string>
}) {
    const today = getTodayWeekdayIndex()

    const uniqueStudentIds = useMemo(
        () =>
            Array.from(
                new Set(
                    (Array.isArray(schedule.assignments)
                        ? schedule.assignments
                        : []
                    ).map((a) => a.assistant_id),
                ),
            ),
        [schedule],
    )

    const studentColorIndex = useMemo(
        () =>
            Object.fromEntries(
                uniqueStudentIds.map((id, i) => [
                    id,
                    i % STUDENT_COLORS.length,
                ]),
            ),
        [uniqueStudentIds],
    )

    const assignmentsByShift = useMemo(() => {
        const map: Record<string, string[]> = {}
        for (const a of Array.isArray(schedule.assignments)
            ? schedule.assignments
            : []) {
            if (!map[a.shift_id]) map[a.shift_id] = []
            map[a.shift_id].push(a.assistant_id)
        }
        return map
    }, [schedule])

    const timeSlots = useMemo(() => {
        const slots = new Map<string, { start: string; end: string }>()
        for (const s of shiftTemplates) {
            const key = `${s.start_time}-${s.end_time}`
            if (!slots.has(key))
                slots.set(key, { start: s.start_time, end: s.end_time })
        }
        return Array.from(slots.values()).sort((a, b) =>
            a.start.localeCompare(b.start),
        )
    }, [shiftTemplates])

    const shiftLookup = useMemo(() => {
        const map = new Map<string, ShiftTemplate>()
        for (const s of shiftTemplates)
            map.set(`${s.start_time}-${s.end_time}-${s.day_of_week}`, s)
        return map
    }, [shiftTemplates])

    return (
        <Card>
            <CardHeader>
                <CardTitle>Weekly Overview</CardTitle>
                <CardDescription>{schedule.title}</CardDescription>
            </CardHeader>
            <CardContent>
                {timeSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <CalendarDays className="h-8 w-8 text-muted-foreground/40" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            No shift templates configured.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <div
                                className="grid min-w-[36rem]"
                                style={{
                                    gridTemplateColumns:
                                        '3.5rem repeat(5, 1fr)',
                                    gridTemplateRows: `auto repeat(${timeSlots.length}, auto)`,
                                }}
                            >
                                <div className="border-b border-border" />
                                {WEEKDAYS_SHORT.map((day, idx) => (
                                    <div
                                        key={day}
                                        className={cn(
                                            'flex items-center justify-center border-b border-border py-2',
                                            idx > 0 && 'border-l border-border',
                                            idx === today &&
                                                'bg-foreground/[0.03]',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'text-xs font-medium',
                                                idx === today
                                                    ? 'text-foreground'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {day}
                                        </span>
                                    </div>
                                ))}

                                {timeSlots.map((slot) => (
                                    <Fragment key={slot.start}>
                                        <div className="flex items-start justify-end border-b border-r border-border pr-2 pt-1.5">
                                            <span className="text-[11px] font-medium text-muted-foreground tabular-nums leading-none">
                                                {formatHour(slot.start)}
                                            </span>
                                        </div>

                                        {WEEKDAYS_SHORT.map((_, dayIdx) => {
                                            const shift = shiftLookup.get(
                                                `${slot.start}-${slot.end}-${dayIdx}`,
                                            )
                                            const students = shift
                                                ? (assignmentsByShift[
                                                      shift.id
                                                  ] ?? [])
                                                : []

                                            return (
                                                <div
                                                    key={`${slot.start}-${dayIdx}`}
                                                    className={cn(
                                                        'min-h-10 border-b border-border p-1.5 sm:p-2',
                                                        dayIdx > 0 &&
                                                            'border-l border-border',
                                                        dayIdx === today &&
                                                            'bg-foreground/[0.03]',
                                                    )}
                                                >
                                                    {students.length > 0 ? (
                                                        <div className="flex flex-col gap-0.5 sm:gap-1">
                                                            {students.map(
                                                                (sid) => {
                                                                    const color =
                                                                        STUDENT_COLORS[
                                                                            studentColorIndex[
                                                                                sid
                                                                            ] ??
                                                                                0
                                                                        ]
                                                                    const name =
                                                                        studentNames[
                                                                            sid
                                                                        ] ||
                                                                        sid.slice(
                                                                            0,
                                                                            6,
                                                                        )
                                                                    const firstName =
                                                                        name.split(
                                                                            ' ',
                                                                        )[0]
                                                                    return (
                                                                        <TooltipProvider
                                                                            key={
                                                                                sid
                                                                            }
                                                                            delayDuration={
                                                                                200
                                                                            }
                                                                        >
                                                                            <Tooltip>
                                                                                <TooltipTrigger
                                                                                    asChild
                                                                                >
                                                                                    <div
                                                                                        className={cn(
                                                                                            'flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs leading-none',
                                                                                            color.bg,
                                                                                        )}
                                                                                    >
                                                                                        <span
                                                                                            className={cn(
                                                                                                'h-1.5 w-1.5 shrink-0 rounded-full',
                                                                                                color.dot,
                                                                                            )}
                                                                                        />
                                                                                        <span className="min-w-0 truncate font-medium text-foreground">
                                                                                            {
                                                                                                firstName
                                                                                            }
                                                                                        </span>
                                                                                    </div>
                                                                                </TooltipTrigger>
                                                                                <TooltipContent side="top">
                                                                                    {
                                                                                        name
                                                                                    }
                                                                                </TooltipContent>
                                                                            </Tooltip>
                                                                        </TooltipProvider>
                                                                    )
                                                                },
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className="flex h-full items-center justify-center">
                                                            <span className="text-[9px] text-muted-foreground/30">
                                                                —
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </Fragment>
                                ))}
                            </div>
                        </div>

                        {uniqueStudentIds.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 border-t pt-3">
                                {uniqueStudentIds.map((id) => {
                                    const color =
                                        STUDENT_COLORS[
                                            studentColorIndex[id] ?? 0
                                        ]
                                    const name =
                                        studentNames[id] || id.slice(0, 8)
                                    return (
                                        <div
                                            key={id}
                                            className="flex items-center gap-1.5 text-xs"
                                        >
                                            <span
                                                className={cn(
                                                    'h-2 w-2 shrink-0 rounded-full',
                                                    color.dot,
                                                )}
                                            />
                                            <span className="truncate max-w-[7rem]">
                                                {name}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

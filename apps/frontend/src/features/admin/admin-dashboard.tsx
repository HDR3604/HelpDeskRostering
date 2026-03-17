import { useRef, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CalendarDays, ChevronDown, Clock, X } from 'lucide-react'
import { SummaryCards } from './components/summary-cards'
import { StudentApplicationsTable } from './components/student-applications-table'
import { TranscriptDialog } from './components/transcript-dialog'
import { MiniWeeklySchedule } from './components/mini-weekly-schedule'
import { HoursWorkedChart } from './components/hours-worked-chart'
import { MissedShiftsChart } from './components/missed-shifts-chart'
import { useActiveSchedule } from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { buildStudentNameMap } from '@/lib/mock-data'
import { formatDateRange } from '@/lib/format'
import { getApplicationStatus } from '@/types/student'
import type { Student } from '@/types/student'
import {
    useStudents,
    useAcceptStudent,
    useRejectStudent,
} from '@/lib/queries/students'

const TOAST_DURATION = 5000

export function AdminDashboard() {
    const studentsQuery = useStudents()
    const students = studentsQuery.data ?? []

    const acceptMutation = useAcceptStudent()
    const rejectMutation = useRejectStudent()

    const activeScheduleQuery = useActiveSchedule()
    const activeSchedule = activeScheduleQuery.data ?? null
    const shiftTemplatesQuery = useShiftTemplates()
    const shiftTemplates = shiftTemplatesQuery.data ?? []

    const studentNames = useMemo(
        () => buildStudentNameMap(students),
        [students],
    )

    // Optimistic local state overlay — tracks pending undo-able changes
    const [optimisticUpdates, setOptimisticUpdates] = useState<
        Map<number, { accepted_at: string | null; rejected_at: string | null }>
    >(new Map())

    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(
        new Set(),
    )
    const pendingTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
        new Map(),
    )

    // Merge server data with optimistic updates
    const displayStudents = useMemo(() => {
        if (optimisticUpdates.size === 0) return students
        return students.map((s) => {
            const update = optimisticUpdates.get(s.student_id)
            return update ? { ...s, ...update } : s
        })
    }, [students, optimisticUpdates])

    function toggleStudent(name: string) {
        setSelectedStudents((prev) => {
            const next = new Set(prev)
            if (next.has(name)) next.delete(name)
            else next.add(name)
            return next
        })
    }

    // Derive chart data from active schedule assignments
    const assignments = useMemo(
        () =>
            Array.isArray(activeSchedule?.assignments)
                ? activeSchedule.assignments
                : [],
        [activeSchedule],
    )

    const hoursAssigned = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const a of assignments) {
            counts[a.assistant_id] = (counts[a.assistant_id] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([id, hours], i) => ({
                name: studentNames[id] || id,
                hours,
                fill: `var(--chart-${(i % 5) + 1})`,
            }))
            .sort((a, b) => b.hours - a.hours)
    }, [assignments, studentNames])

    const shiftAttendance = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const a of assignments) {
            counts[a.assistant_id] = (counts[a.assistant_id] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([id, total], i) => ({
                name: studentNames[id] || id,
                missed: 0, // no time logs yet
                total,
                fill: `var(--chart-${(i % 5) + 1})`,
            }))
            .sort((a, b) => b.total - a.total)
    }, [assignments, studentNames])

    const filteredHours = useMemo(
        () =>
            selectedStudents.size === 0
                ? hoursAssigned
                : hoursAssigned.filter((s) => selectedStudents.has(s.name)),
        [selectedStudents, hoursAssigned],
    )
    const filteredMissed = useMemo(
        () =>
            selectedStudents.size === 0
                ? shiftAttendance
                : shiftAttendance.filter((s) => selectedStudents.has(s.name)),
        [selectedStudents, shiftAttendance],
    )

    const { pendingCount, acceptedCount } = useMemo(() => {
        let pending = 0
        let accepted = 0
        for (const s of displayStudents) {
            const status = getApplicationStatus(s)
            if (status === 'pending') pending++
            else if (status === 'accepted') accepted++
        }
        return { pendingCount: pending, acceptedCount: accepted }
    }, [displayStudents])

    const scheduledThisWeekCount = useMemo(
        () => new Set(assignments.map((a) => a.assistant_id)).size,
        [assignments],
    )

    const scheduleDescription = useMemo(
        () =>
            activeSchedule?.effective_from
                ? formatDateRange(
                      activeSchedule.effective_from,
                      activeSchedule.effective_to ?? null,
                  )
                : undefined,
        [activeSchedule],
    )

    function scheduleCommit(studentId: number, action: 'accept' | 'reject') {
        const existing = pendingTimers.current.get(studentId)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(() => {
            pendingTimers.current.delete(studentId)

            // Clear optimistic state only after mutation settles (success or error)
            const onSettled = () => {
                setOptimisticUpdates((prev) => {
                    const next = new Map(prev)
                    next.delete(studentId)
                    return next
                })
            }

            if (action === 'accept') {
                acceptMutation.mutate(studentId, { onSettled })
            } else {
                rejectMutation.mutate(studentId, { onSettled })
            }
        }, TOAST_DURATION)

        pendingTimers.current.set(studentId, timer)
    }

    function cancelCommit(studentId: number) {
        const timer = pendingTimers.current.get(studentId)
        if (timer) {
            clearTimeout(timer)
            pendingTimers.current.delete(studentId)
        }
        // Remove optimistic update to revert to server state
        setOptimisticUpdates((prev) => {
            const next = new Map(prev)
            next.delete(studentId)
            return next
        })
    }

    function handleAccept(studentId: number) {
        const prev = displayStudents.find((s) => s.student_id === studentId)
        if (!prev) return

        // Apply optimistic update
        setOptimisticUpdates((m) => {
            const next = new Map(m)
            next.set(studentId, {
                accepted_at: new Date().toISOString(),
                rejected_at: null,
            })
            return next
        })

        scheduleCommit(studentId, 'accept')
        toast.success(`${prev.first_name} ${prev.last_name} accepted`, {
            duration: TOAST_DURATION,
            action: {
                label: 'Undo',
                onClick: () => cancelCommit(studentId),
            },
        })
    }

    function handleReject(studentId: number) {
        const prev = displayStudents.find((s) => s.student_id === studentId)
        if (!prev) return

        // Apply optimistic update
        setOptimisticUpdates((m) => {
            const next = new Map(m)
            next.set(studentId, {
                rejected_at: new Date().toISOString(),
                accepted_at: null,
            })
            return next
        })

        scheduleCommit(studentId, 'reject')
        toast.error(`${prev.first_name} ${prev.last_name} rejected`, {
            duration: TOAST_DURATION,
            action: {
                label: 'Undo',
                onClick: () => cancelCommit(studentId),
            },
        })
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Dashboard
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Overview of student applications, scheduling, and helpdesk
                    operations.
                </p>
            </div>

            <SummaryCards
                pendingCount={pendingCount}
                acceptedCount={acceptedCount}
                scheduledThisWeekCount={scheduledThisWeekCount}
                totalCount={displayStudents.length}
            />

            {activeSchedule && assignments.length > 0 ? (
                <>
                    {/* Schedule */}
                    <MiniWeeklySchedule
                        schedule={activeSchedule}
                        shiftTemplates={shiftTemplates}
                        studentNames={studentNames}
                    />

                    {/* Analytics */}
                    <div className="space-y-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Analytics
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    Hours assigned and attendance for the
                                    current schedule period.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {selectedStudents.size > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            setSelectedStudents(new Set())
                                        }
                                    >
                                        <X className="mr-1 h-3.5 w-3.5" />
                                        Clear
                                    </Button>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            {selectedStudents.size === 0
                                                ? 'All students'
                                                : `${selectedStudents.size} selected`}
                                            <ChevronDown className="ml-1 h-3.5 w-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {hoursAssigned.map((s) => (
                                            <DropdownMenuCheckboxItem
                                                key={s.name}
                                                checked={selectedStudents.has(
                                                    s.name,
                                                )}
                                                onCheckedChange={() =>
                                                    toggleStudent(s.name)
                                                }
                                                onSelect={(e) =>
                                                    e.preventDefault()
                                                }
                                            >
                                                {s.name}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <HoursWorkedChart
                                data={filteredHours}
                                description={scheduleDescription}
                            />
                            <MissedShiftsChart
                                data={filteredMissed}
                                description={scheduleDescription}
                            />
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                    <div className="relative">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                            <CalendarDays className="size-7 text-primary" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full border-2 border-background bg-muted">
                            <Clock className="size-3 text-muted-foreground" />
                        </div>
                    </div>
                    <h2 className="mt-5 text-base font-semibold">
                        No active schedule
                    </h2>
                    <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                        Create and activate a schedule from the{' '}
                        <span className="font-medium text-foreground">
                            Schedule
                        </span>{' '}
                        page to see the weekly overview and analytics here.
                    </p>
                </div>
            )}

            {/* Student Applications */}
            <div className="space-y-3">
                <div>
                    <h2 className="text-lg font-semibold">
                        Student Applications
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Review and manage incoming student applications.
                    </p>
                </div>
                <StudentApplicationsTable
                    students={displayStudents}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onSync={async () => {
                        await studentsQuery.refetch()
                    }}
                    onViewTranscript={setTranscriptStudent}
                />
            </div>

            <TranscriptDialog
                student={transcriptStudent}
                open={transcriptStudent !== null}
                onOpenChange={(open) => {
                    if (!open) setTranscriptStudent(null)
                }}
            />
        </div>
    )
}

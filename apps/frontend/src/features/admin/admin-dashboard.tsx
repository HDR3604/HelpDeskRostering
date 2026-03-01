import { useRef, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, X } from 'lucide-react'
import { SummaryCards } from './components/summary-cards'
import { StudentApplicationsTable } from './components/student-applications-table'
import { TranscriptDialog } from './components/transcript-dialog'
import { MiniWeeklySchedule } from './components/mini-weekly-schedule'
import { HoursWorkedChart } from './components/hours-worked-chart'
import { MissedShiftsChart } from './components/missed-shifts-chart'
import {
    MOCK_ACTIVE_SCHEDULE,
    MOCK_SHIFT_TEMPLATES,
    STUDENT_NAME_MAP,
    MOCK_HOURS_WORKED,
    MOCK_MISSED_SHIFTS,
} from '@/lib/mock-data'
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

    const filteredHours = useMemo(
        () =>
            [
                ...(selectedStudents.size === 0
                    ? MOCK_HOURS_WORKED
                    : MOCK_HOURS_WORKED.filter((s) =>
                          selectedStudents.has(s.name),
                      )),
            ].sort((a, b) => b.hours - a.hours),
        [selectedStudents],
    )
    const filteredMissed = useMemo(
        () =>
            [
                ...(selectedStudents.size === 0
                    ? MOCK_MISSED_SHIFTS
                    : MOCK_MISSED_SHIFTS.filter((s) =>
                          selectedStudents.has(s.name),
                      )),
            ].sort((a, b) => b.total - a.total),
        [selectedStudents],
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
        () =>
            new Set(
                (Array.isArray(MOCK_ACTIVE_SCHEDULE.assignments)
                    ? MOCK_ACTIVE_SCHEDULE.assignments
                    : []
                ).map((a) => a.assistant_id),
            ).size,
        [],
    )

    function scheduleCommit(studentId: number, action: 'accept' | 'reject') {
        const existing = pendingTimers.current.get(studentId)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(() => {
            pendingTimers.current.delete(studentId)
            // Clear the optimistic update — server data will take over after refetch
            setOptimisticUpdates((prev) => {
                const next = new Map(prev)
                next.delete(studentId)
                return next
            })

            if (action === 'accept') {
                acceptMutation.mutate(studentId)
            } else {
                rejectMutation.mutate(studentId)
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

            <StudentApplicationsTable
                students={displayStudents}
                onAccept={handleAccept}
                onReject={handleReject}
                onSync={async () => {
                    await studentsQuery.refetch()
                }}
                onViewTranscript={setTranscriptStudent}
            />

            {/* Charts */}
            <div className="space-y-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Analytics</h2>
                        <p className="text-sm text-muted-foreground">
                            Hours worked and attendance for the current schedule
                            period.
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {selectedStudents.size > 0 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStudents(new Set())}
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
                                {MOCK_HOURS_WORKED.map((s) => (
                                    <DropdownMenuCheckboxItem
                                        key={s.name}
                                        checked={selectedStudents.has(s.name)}
                                        onCheckedChange={() =>
                                            toggleStudent(s.name)
                                        }
                                        onSelect={(e) => e.preventDefault()}
                                    >
                                        {s.name}
                                    </DropdownMenuCheckboxItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <HoursWorkedChart data={filteredHours} />
                    <MissedShiftsChart data={filteredMissed} />
                </div>
            </div>

            {/* Schedule */}
            <MiniWeeklySchedule
                schedule={MOCK_ACTIVE_SCHEDULE}
                shiftTemplates={MOCK_SHIFT_TEMPLATES}
                studentNames={STUDENT_NAME_MAP}
            />

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

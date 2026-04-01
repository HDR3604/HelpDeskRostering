import { useRef, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Clock } from 'lucide-react'
import { SummaryCards } from './components/summary-cards'
import { TimelogStatus } from './components/timelog-status'
import { StudentApplicationsTable } from './components/student-applications-table'
import { TranscriptDialog } from './components/transcript-dialog'
import { MiniWeeklySchedule } from './components/mini-weekly-schedule'
import { TodaysShifts } from './components/todays-shifts'
import { DailyCoverageChart } from './components/daily-coverage-chart'
import { useActiveSchedule } from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { buildStudentNameMap } from '@/lib/mock-data'
import { formatDateRange } from '@/lib/format'
import { getApplicationStatus } from '@/types/student'
import type { Student } from '@/types/student'
import { useQueryClient } from '@tanstack/react-query'
import {
    useStudents,
    useAcceptStudent,
    useRejectStudent,
    studentKeys,
} from '@/lib/queries/students'

const TOAST_DURATION = 3000

export function AdminDashboard() {
    const queryClient = useQueryClient()
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
        Map<
            number,
            {
                accepted_at: string | null
                rejected_at: string | null
                status: string
            }
        >
    >(new Map())

    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
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

    // Derive chart data from active schedule assignments
    const assignments = useMemo(
        () =>
            Array.isArray(activeSchedule?.assignments)
                ? activeSchedule.assignments
                : [],
        [activeSchedule],
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

        const timer = setTimeout(async () => {
            pendingTimers.current.delete(studentId)

            const mutation =
                action === 'accept'
                    ? acceptMutation.mutateAsync(studentId)
                    : rejectMutation.mutateAsync(studentId)

            // Keep optimistic overlay until the mutation and list refetch settle
            await mutation.catch(() => {})
            await queryClient.invalidateQueries({
                queryKey: studentKeys.lists(),
            })
            setOptimisticUpdates((prev) => {
                const next = new Map(prev)
                next.delete(studentId)
                return next
            })
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
                status: 'accepted',
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
                status: 'rejected',
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
                    {/* Right now — what needs attention today */}
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                        <TodaysShifts
                            assignments={assignments}
                            studentNames={studentNames}
                        />
                        <TimelogStatus />
                        <DailyCoverageChart
                            assignments={assignments}
                            description={scheduleDescription}
                        />
                    </div>

                    {/* This week — schedule overview */}
                    <MiniWeeklySchedule
                        schedule={activeSchedule}
                        shiftTemplates={shiftTemplates}
                        studentNames={studentNames}
                    />
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

import { useState, useMemo, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { RefreshCw, Check, X } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getStudentColumns } from '../columns/application-columns'
import { TranscriptDialog } from '../components/transcript-dialog'
import { useStudents } from '@/features/admin/student-management/student-context'
import type { Student } from '@/types/student'
import { getApplicationStatus, type ApplicationStatus } from '@/types/student'
import type { RowSelectionState } from '@tanstack/react-table'

const statusOrder: Record<ApplicationStatus, number> = {
    pending: 0,
    accepted: 1,
    rejected: 2,
    deactivated: 3,
}

const UNDO_DELAY = 3000

type ConfirmAction =
    | { type: 'bulk-accept'; studentIds: number[] }
    | { type: 'bulk-reject'; studentIds: number[] }

export function Applications() {
    const {
        students,
        handleAccept,
        handleReject,
        refetch,
        isRefetching,
        isMutating,
    } = useStudents()
    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
        null,
    )
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

    // Optimistic updates: overlay on top of server data
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
    const pendingTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(
        new Map(),
    )

    const displayStudents = useMemo(() => {
        if (optimisticUpdates.size === 0) return students
        return students.map((s) => {
            const update = optimisticUpdates.get(s.student_id)
            return update ? { ...s, ...update } : s
        })
    }, [students, optimisticUpdates])

    const pendingCount = displayStudents.filter(
        (s) => getApplicationStatus(s) === 'pending',
    ).length

    const sorted = useMemo(
        () =>
            [...displayStudents].sort(
                (a, b) =>
                    statusOrder[getApplicationStatus(a)] -
                    statusOrder[getApplicationStatus(b)],
            ),
        [displayStudents],
    )

    const selectedPendingIds = useMemo(() => {
        return Object.keys(rowSelection)
            .filter((k) => rowSelection[k])
            .map(Number)
            .map((i) => sorted[i])
            .filter((s) => s && getApplicationStatus(s) === 'pending')
            .map((s) => s.student_id)
    }, [rowSelection, sorted])

    function scheduleCommit(studentId: number, action: 'accept' | 'reject') {
        const existing = pendingTimers.current.get(studentId)
        if (existing) clearTimeout(existing)

        const timer = setTimeout(() => {
            pendingTimers.current.delete(studentId)

            const onSettled = () => {
                setOptimisticUpdates((prev) => {
                    const next = new Map(prev)
                    next.delete(studentId)
                    return next
                })
            }

            if (action === 'accept') {
                handleAccept(studentId)
            } else {
                handleReject(studentId)
            }

            // Clear optimistic state after a short delay to let the mutation settle
            setTimeout(onSettled, 1000)
        }, UNDO_DELAY)

        pendingTimers.current.set(studentId, timer)
    }

    function cancelCommit(studentId: number) {
        const timer = pendingTimers.current.get(studentId)
        if (timer) {
            clearTimeout(timer)
            pendingTimers.current.delete(studentId)
        }
        setOptimisticUpdates((prev) => {
            const next = new Map(prev)
            next.delete(studentId)
            return next
        })
    }

    const onAccept = useCallback(
        (studentId: number) => {
            const student = displayStudents.find(
                (s) => s.student_id === studentId,
            )
            if (!student) return

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
            toast.success(
                `${student.first_name} ${student.last_name} accepted`,
                {
                    duration: UNDO_DELAY,
                    action: {
                        label: 'Undo',
                        onClick: () => cancelCommit(studentId),
                    },
                },
            )
        },
        [displayStudents],
    )

    const onReject = useCallback(
        (studentId: number) => {
            const student = displayStudents.find(
                (s) => s.student_id === studentId,
            )
            if (!student) return

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
            toast.error(`${student.first_name} ${student.last_name} rejected`, {
                duration: UNDO_DELAY,
                action: {
                    label: 'Undo',
                    onClick: () => cancelCommit(studentId),
                },
            })
        },
        [displayStudents],
    )

    const hasPendingOptimistic = optimisticUpdates.size > 0

    const columns = useMemo(
        () =>
            getStudentColumns({
                onAccept,
                onReject,
                onViewTranscript: setTranscriptStudent,
                isMutating: isMutating || hasPendingOptimistic,
            }),
        [onAccept, onReject, isMutating, hasPendingOptimistic],
    )

    function handleBulkConfirm() {
        if (!confirmAction) return

        switch (confirmAction.type) {
            case 'bulk-accept':
                for (const id of confirmAction.studentIds) {
                    handleAccept(id)
                }
                setRowSelection({})
                break
            case 'bulk-reject':
                for (const id of confirmAction.studentIds) {
                    handleReject(id)
                }
                setRowSelection({})
                break
        }

        setConfirmAction(null)
    }

    function getConfirmProps(): {
        title: string
        description: React.ReactNode
        confirmLabel: string
        destructive: boolean
    } {
        if (!confirmAction) {
            return {
                title: '',
                description: '',
                confirmLabel: '',
                destructive: false,
            }
        }

        switch (confirmAction.type) {
            case 'bulk-accept':
                return {
                    title: 'Accept Applications',
                    description: `Are you sure you want to accept ${confirmAction.studentIds.length} applicant${confirmAction.studentIds.length > 1 ? 's' : ''}? They will be added to the active roster.`,
                    confirmLabel: `Accept (${confirmAction.studentIds.length})`,
                    destructive: false,
                }
            case 'bulk-reject':
                return {
                    title: 'Reject Applications',
                    description: `Are you sure you want to reject ${confirmAction.studentIds.length} applicant${confirmAction.studentIds.length > 1 ? 's' : ''}?`,
                    confirmLabel: `Reject (${confirmAction.studentIds.length})`,
                    destructive: true,
                }
        }
    }

    const confirmProps = getConfirmProps()
    const hasSelection = Object.values(rowSelection).some(Boolean)

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle>Applications</CardTitle>
                                {pendingCount > 0 && (
                                    <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                                        {pendingCount} pending
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Review transcripts and accept or reject
                                applicants
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            disabled={isRefetching}
                            onClick={() => {
                                refetch()
                                toast.success('Applications synced')
                            }}
                        >
                            <RefreshCw
                                className={cn(
                                    'h-3.5 w-3.5',
                                    isRefetching && 'animate-spin',
                                )}
                            />
                            Sync
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {hasSelection && selectedPendingIds.length > 0 && (
                        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 sm:gap-3">
                            <span className="text-sm text-muted-foreground">
                                {selectedPendingIds.length} pending selected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isMutating}
                                onClick={() =>
                                    setConfirmAction({
                                        type: 'bulk-accept',
                                        studentIds: selectedPendingIds,
                                    })
                                }
                            >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                Accept ({selectedPendingIds.length})
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={isMutating}
                                onClick={() =>
                                    setConfirmAction({
                                        type: 'bulk-reject',
                                        studentIds: selectedPendingIds,
                                    })
                                }
                            >
                                <X className="mr-1 h-3.5 w-3.5" />
                                Reject ({selectedPendingIds.length})
                            </Button>
                        </div>
                    )}
                    <DataTable
                        columns={columns}
                        data={sorted}
                        searchPlaceholder="Search by name, ID, or email"
                        globalFilter
                        pageSize={10}
                        emptyMessage="No applications yet."
                        enableRowSelection
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                    />
                </CardContent>
            </Card>
            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmAction(null)
                }}
                title={confirmProps.title}
                description={confirmProps.description}
                confirmLabel={confirmProps.confirmLabel}
                onConfirm={handleBulkConfirm}
                destructive={confirmProps.destructive}
                loading={isMutating}
            />
            <TranscriptDialog
                student={transcriptStudent}
                open={transcriptStudent !== null}
                onOpenChange={(open) => {
                    if (!open) setTranscriptStudent(null)
                }}
            />
        </>
    )
}

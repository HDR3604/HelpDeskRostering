import { useState, useMemo, useCallback } from 'react'
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
import { RefreshCw, LoaderCircle, Check, X } from 'lucide-react'
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

type ConfirmAction =
    | { type: 'accept'; studentId: number }
    | { type: 'reject'; studentId: number }
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

    const pendingCount = students.filter(
        (s) => getApplicationStatus(s) === 'pending',
    ).length

    const sorted = useMemo(
        () =>
            [...students].sort(
                (a, b) =>
                    statusOrder[getApplicationStatus(a)] -
                    statusOrder[getApplicationStatus(b)],
            ),
        [students],
    )

    const selectedPendingIds = useMemo(() => {
        return Object.keys(rowSelection)
            .filter((k) => rowSelection[k])
            .map(Number)
            .map((i) => sorted[i])
            .filter((s) => s && getApplicationStatus(s) === 'pending')
            .map((s) => s.student_id)
    }, [rowSelection, sorted])

    const onAccept = useCallback((studentId: number) => {
        setConfirmAction({ type: 'accept', studentId })
    }, [])

    const onReject = useCallback((studentId: number) => {
        setConfirmAction({ type: 'reject', studentId })
    }, [])

    const columns = useMemo(
        () =>
            getStudentColumns({
                onAccept,
                onReject,
                onViewTranscript: setTranscriptStudent,
                isMutating,
            }),
        [onAccept, onReject, isMutating],
    )

    function handleConfirm() {
        if (!confirmAction) return

        switch (confirmAction.type) {
            case 'accept':
                handleAccept(confirmAction.studentId)
                break
            case 'reject':
                handleReject(confirmAction.studentId)
                break
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
            case 'accept': {
                const s = students.find(
                    (s) => s.student_id === confirmAction.studentId,
                )
                const name = s ? `${s.first_name} ${s.last_name}` : ''
                return {
                    title: 'Accept Application',
                    description: `Are you sure you want to accept ${name}? They will be added to the active roster.`,
                    confirmLabel: 'Accept',
                    destructive: false,
                }
            }
            case 'reject': {
                const s = students.find(
                    (s) => s.student_id === confirmAction.studentId,
                )
                const name = s ? `${s.first_name} ${s.last_name}` : ''
                return {
                    title: 'Reject Application',
                    description: `Are you sure you want to reject ${name}?`,
                    confirmLabel: 'Reject',
                    destructive: true,
                }
            }
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
                    <div className="flex items-start justify-between gap-3">
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
                            onClick={refetch}
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
                <CardContent className="relative">
                    {isRefetching && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-lg bg-background/30 backdrop-blur-[2px]">
                            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {hasSelection && selectedPendingIds.length > 0 && (
                        <div className="mb-3 flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2">
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
                onConfirm={handleConfirm}
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

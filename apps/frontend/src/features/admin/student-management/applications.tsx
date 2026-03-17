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
import { RefreshCw, LoaderCircle } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getStudentColumns } from '../columns/application-columns'
import { TranscriptDialog } from '../components/transcript-dialog'
import { useStudents } from '@/features/admin/student-management/student-context'
import type { Student } from '@/types/student'
import { getApplicationStatus, type ApplicationStatus } from '@/types/student'

const statusOrder: Record<ApplicationStatus, number> = {
    pending: 0,
    accepted: 1,
    rejected: 2,
    deactivated: 3,
}

type ConfirmAction =
    | { type: 'accept'; studentId: number }
    | { type: 'reject'; studentId: number }

export function Applications() {
    const { students, handleAccept, handleReject, refetch, isRefetching } =
        useStudents()
    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
        null,
    )

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
            }),
        [onAccept, onReject],
    )

    function handleConfirm() {
        if (!confirmAction) return

        if (confirmAction.type === 'accept') {
            handleAccept(confirmAction.studentId)
        } else {
            handleReject(confirmAction.studentId)
        }

        setConfirmAction(null)
    }

    const confirmStudent = confirmAction
        ? students.find((s) => s.student_id === confirmAction.studentId)
        : null
    const confirmName = confirmStudent
        ? `${confirmStudent.first_name} ${confirmStudent.last_name}`
        : ''

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
                    <DataTable
                        columns={columns}
                        data={sorted}
                        searchPlaceholder="Search by name, ID, or email"
                        globalFilter
                        pageSize={10}
                        emptyMessage="No applications yet."
                    />
                </CardContent>
            </Card>
            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmAction(null)
                }}
                title={
                    confirmAction?.type === 'accept'
                        ? 'Accept Application'
                        : 'Reject Application'
                }
                description={
                    confirmAction?.type === 'accept'
                        ? `Are you sure you want to accept ${confirmName}? They will be added to the active roster.`
                        : `Are you sure you want to reject ${confirmName}?`
                }
                confirmLabel={
                    confirmAction?.type === 'accept' ? 'Accept' : 'Reject'
                }
                onConfirm={handleConfirm}
                destructive={confirmAction?.type === 'reject'}
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

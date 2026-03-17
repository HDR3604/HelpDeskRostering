import { useState, useMemo, useCallback } from 'react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { UserCheck, UserMinus } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { getRosterColumns, type RosterEntry } from '../columns/roster-columns'
import { TranscriptDialog } from '@/features/admin/components/transcript-dialog'
import {
    useBulkDeactivateStudents,
    useBulkActivateStudents,
} from '@/lib/queries/students'
import type { Student } from '@/types/student'
import type { RowSelectionState } from '@tanstack/react-table'

interface AssistantRosterProps {
    activeStudents: Student[]
    deactivatedStudents: Student[]
    onDeactivate: (student: Student) => void
    onActivate: (student: Student) => void
}

type ConfirmAction =
    | { type: 'deactivate'; student: Student }
    | { type: 'activate'; student: Student }
    | { type: 'bulk-deactivate'; ids: number[] }
    | { type: 'bulk-activate'; ids: number[] }

export function AssistantRoster({
    activeStudents,
    deactivatedStudents,
    onDeactivate,
    onActivate,
}: AssistantRosterProps) {
    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )
    const [statusFilter, setStatusFilter] = useState('all')
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
        null,
    )

    const bulkDeactivate = useBulkDeactivateStudents()
    const bulkActivate = useBulkActivateStudents()

    const rosterData: RosterEntry[] = useMemo(
        () => [
            ...activeStudents.map((s) => ({ ...s, isDeactivated: false })),
            ...deactivatedStudents.map((s) => ({ ...s, isDeactivated: true })),
        ],
        [activeStudents, deactivatedStudents],
    )

    const filtered = useMemo(() => {
        if (statusFilter === 'active')
            return rosterData.filter((s) => !s.isDeactivated)
        if (statusFilter === 'deactivated')
            return rosterData.filter((s) => s.isDeactivated)
        return rosterData
    }, [rosterData, statusFilter])

    const selectedEntries = useMemo(
        () =>
            Object.keys(rowSelection)
                .filter((k) => rowSelection[k])
                .map(Number)
                .map((i) => filtered[i])
                .filter(Boolean),
        [rowSelection, filtered],
    )

    const selectedActiveIds = useMemo(
        () =>
            selectedEntries
                .filter((e) => !e.isDeactivated)
                .map((e) => e.student_id),
        [selectedEntries],
    )

    const selectedDeactivatedIds = useMemo(
        () =>
            selectedEntries
                .filter((e) => e.isDeactivated)
                .map((e) => e.student_id),
        [selectedEntries],
    )

    function handleConfirm() {
        if (!confirmAction) return

        switch (confirmAction.type) {
            case 'deactivate':
                onDeactivate(confirmAction.student)
                break
            case 'activate':
                onActivate(confirmAction.student)
                break
            case 'bulk-deactivate':
                bulkDeactivate.mutate(confirmAction.ids, {
                    onSuccess: () => setRowSelection({}),
                })
                break
            case 'bulk-activate':
                bulkActivate.mutate(confirmAction.ids, {
                    onSuccess: () => setRowSelection({}),
                })
                break
        }

        setConfirmAction(null)
    }

    const handleDeactivate = useCallback((student: Student) => {
        setConfirmAction({ type: 'deactivate', student })
    }, [])

    const handleActivate = useCallback((student: Student) => {
        setConfirmAction({ type: 'activate', student })
    }, [])

    const columns = useMemo(
        () =>
            getRosterColumns({
                onDeactivate: handleDeactivate,
                onActivate: handleActivate,
                onViewTranscript: setTranscriptStudent,
            }),
        [handleDeactivate, handleActivate],
    )

    function getConfirmProps(): {
        title: string
        description: React.ReactNode
        confirmLabel: string
    } {
        if (!confirmAction)
            return { title: '', description: '', confirmLabel: '' }

        switch (confirmAction.type) {
            case 'deactivate':
                return {
                    title: 'Deactivate Assistant',
                    description: `Are you sure you want to deactivate ${confirmAction.student.first_name} ${confirmAction.student.last_name}? They will no longer appear in active schedules.`,
                    confirmLabel: 'Deactivate',
                }
            case 'activate':
                return {
                    title: 'Activate Assistant',
                    description: `Are you sure you want to reactivate ${confirmAction.student.first_name} ${confirmAction.student.last_name}?`,
                    confirmLabel: 'Activate',
                }
            case 'bulk-deactivate':
                return {
                    title: 'Deactivate Assistants',
                    description: `Are you sure you want to deactivate ${confirmAction.ids.length} assistant${confirmAction.ids.length > 1 ? 's' : ''}? They will no longer appear in active schedules.`,
                    confirmLabel: `Deactivate (${confirmAction.ids.length})`,
                }
            case 'bulk-activate':
                return {
                    title: 'Activate Assistants',
                    description: `Are you sure you want to reactivate ${confirmAction.ids.length} assistant${confirmAction.ids.length > 1 ? 's' : ''}?`,
                    confirmLabel: `Activate (${confirmAction.ids.length})`,
                }
        }
    }

    const confirmProps = getConfirmProps()

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle>Team</CardTitle>
                                <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                    {activeStudents.length} active
                                </Badge>
                                {deactivatedStudents.length > 0 && (
                                    <Badge className="bg-muted text-muted-foreground hover:bg-muted">
                                        {deactivatedStudents.length} deactivated
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Manage active and deactivated assistants
                            </CardDescription>
                        </div>
                        <Select
                            value={statusFilter}
                            onValueChange={(v) => {
                                setStatusFilter(v)
                                setRowSelection({})
                            }}
                        >
                            <SelectTrigger size="sm" className="w-36 shrink-0">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="deactivated">
                                    Deactivated
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    {selectedEntries.length > 0 && (
                        <div className="mb-3 flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2">
                            <span className="text-sm text-muted-foreground">
                                {selectedEntries.length} selected
                            </span>
                            {selectedActiveIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={bulkDeactivate.isPending}
                                    onClick={() =>
                                        setConfirmAction({
                                            type: 'bulk-deactivate',
                                            ids: selectedActiveIds,
                                        })
                                    }
                                >
                                    <UserMinus className="mr-1 h-3.5 w-3.5" />
                                    Deactivate ({selectedActiveIds.length})
                                </Button>
                            )}
                            {selectedDeactivatedIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={bulkActivate.isPending}
                                    onClick={() =>
                                        setConfirmAction({
                                            type: 'bulk-activate',
                                            ids: selectedDeactivatedIds,
                                        })
                                    }
                                >
                                    <UserCheck className="mr-1 h-3.5 w-3.5" />
                                    Activate ({selectedDeactivatedIds.length})
                                </Button>
                            )}
                        </div>
                    )}
                    <DataTable
                        columns={columns}
                        data={filtered}
                        searchPlaceholder="Search assistants"
                        globalFilter
                        emptyMessage="No assistants found."
                        pageSize={5}
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
                destructive={
                    confirmAction?.type === 'deactivate' ||
                    confirmAction?.type === 'bulk-deactivate'
                }
                loading={bulkDeactivate.isPending || bulkActivate.isPending}
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

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

    function handleBulkDeactivate() {
        bulkDeactivate.mutate(selectedActiveIds, {
            onSuccess: () => setRowSelection({}),
        })
    }

    function handleBulkActivate() {
        bulkActivate.mutate(selectedDeactivatedIds, {
            onSuccess: () => setRowSelection({}),
        })
    }

    const handleDeactivate = useCallback(
        (student: Student) => {
            onDeactivate(student)
        },
        [onDeactivate],
    )

    const handleActivate = useCallback(
        (student: Student) => {
            onActivate(student)
        },
        [onActivate],
    )

    const columns = useMemo(
        () =>
            getRosterColumns({
                onDeactivate: handleDeactivate,
                onActivate: handleActivate,
                onViewTranscript: setTranscriptStudent,
            }),
        [handleDeactivate, handleActivate],
    )

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
                                    onClick={handleBulkDeactivate}
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
                                    onClick={handleBulkActivate}
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

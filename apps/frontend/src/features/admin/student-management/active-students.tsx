import { useState, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { DataTable } from '@/components/ui/data-table'
import { getRosterColumns, type RosterEntry } from '../columns/roster-columns'
import { TranscriptDialog } from '@/features/admin/components/transcript-dialog'
import type { Student } from '@/types/student'

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

    const handleDeactivate = useCallback(
        (student: Student) => {
            onDeactivate(student)
            toast.success(
                `${student.first_name} ${student.last_name} deactivated`,
                {
                    action: {
                        label: 'Undo',
                        onClick: () => onActivate(student),
                    },
                },
            )
        },
        [onDeactivate, onActivate],
    )

    const handleActivate = useCallback(
        (student: Student) => {
            onActivate(student)
            toast.success(
                `${student.first_name} ${student.last_name} reactivated`,
                {
                    action: {
                        label: 'Undo',
                        onClick: () => onDeactivate(student),
                    },
                },
            )
        },
        [onActivate, onDeactivate],
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
                            onValueChange={setStatusFilter}
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
                    <DataTable
                        columns={columns}
                        data={filtered}
                        searchPlaceholder="Search assistants"
                        globalFilter
                        emptyMessage="No assistants found."
                        pageSize={5}
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

import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import type { Student } from '@/types/student'
import { MOCK_HOURS_WORKED } from '@/lib/mock-data'

function getTotalHours(student: Student): number {
    const record = MOCK_HOURS_WORKED.find(
        (s) => s.name === `${student.first_name} ${student.last_name}`,
    )
    return record ? record.hours : 0
}

interface ActiveStudentColumnCallbacks {
    onDeactivate: (student: Student) => void
    onViewTranscript: (student: Student) => void
}

export function getActiveStudentColumns({
    onDeactivate,
    onViewTranscript,
}: ActiveStudentColumnCallbacks): ColumnDef<Student>[] {
    return [
        {
            accessorKey: 'student_id',
            header: 'ID',
            cell: ({ row }) => (
                <span className="font-mono text-xs">
                    {row.original.student_id}
                </span>
            ),
        },
        {
            id: 'name',
            accessorFn: (row) =>
                `${row.first_name} ${row.last_name} ${row.email_address}`,
            header: 'Name',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.first_name} {row.original.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {row.original.email_address}
                    </p>
                </div>
            ),
        },
        {
            id: 'hours',
            accessorFn: (row) => getTotalHours(row),
            header: 'Hours this Week',
            cell: ({ row }) => <span>{getTotalHours(row.original)}</span>,
        },
        {
            id: 'degree',
            accessorFn: (row) => row.transcript_metadata.degree_programme,
            header: 'Degree',
            cell: ({ row }) => (
                <span>{row.original.transcript_metadata.degree_programme}</span>
            ),
        },
        {
            id: 'transcript',
            enableSorting: false,
            header: 'Transcript',
            cell: ({ row }) => (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewTranscript(row.original)}
                >
                    <FileText className="mr-1 h-3.5 w-3.5" />
                    View
                </Button>
            ),
        },
        {
            id: 'actions',
            enableSorting: false,
            header: () => <div className="text-right">Actions</div>,
            cell: ({ row }) => (
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onDeactivate(row.original)}
                    >
                        Deactivate
                    </Button>
                </div>
            ),
        },
    ]
}

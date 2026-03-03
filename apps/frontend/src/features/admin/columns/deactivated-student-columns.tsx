import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import type { Student } from '@/types/student'
import { MOCK_HOURS_WORKED } from '@/lib/mock-data'

function getTotalHours(student: Student): number {
    const record = MOCK_HOURS_WORKED.find(
        (s) => s.name === `${student.first_name} ${student.last_name}`,
    )
    return record ? record.hours : 0
}

interface DeactivatedStudentColumnCallbacks {
    onActivate: (student: Student) => void
}

export function getDeactivatedStudentColumns({
    onActivate,
}: DeactivatedStudentColumnCallbacks): ColumnDef<Student>[] {
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
            accessorFn: (row) => `${row.first_name} ${row.last_name}`,
            header: 'Name',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.first_name} {row.original.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Level {row.original.transcript_metadata.current_level}
                    </p>
                </div>
            ),
        },
        {
            id: 'contact',
            accessorFn: (row) => row.email_address,
            header: 'Contact',
            cell: ({ row }) => (
                <span className="text-sm">{row.original.email_address}</span>
            ),
        },
        {
            id: 'hours',
            accessorFn: (row) => getTotalHours(row),
            header: 'Total Hours',
            cell: ({ row }) => <span>{getTotalHours(row.original)}</span>,
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
                        onClick={() => onActivate(row.original)}
                    >
                        Activate
                    </Button>
                </div>
            ),
        },
    ]
}

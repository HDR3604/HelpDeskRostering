import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, FileText, UserCheck } from 'lucide-react'
import { CopyMenuItem } from '../components/copy-menu-item'
import type { Student } from '@/types/student'

interface DeactivatedStudentColumnCallbacks {
    onActivate: (student: Student) => void
    onViewTranscript: (student: Student) => void
}

export function getDeactivatedStudentColumns({
    onActivate,
    onViewTranscript,
}: DeactivatedStudentColumnCallbacks): ColumnDef<Student>[] {
    return [
        {
            id: 'name',
            accessorFn: (row) =>
                `${row.first_name} ${row.last_name} ${row.email_address} ${row.student_id} ${row.transcript_metadata.degree_programme}`,
            header: 'Assistant',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.first_name} {row.original.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {row.original.transcript_metadata.degree_programme}
                    </p>
                </div>
            ),
        },
        {
            id: 'contact',
            accessorFn: (row) => row.email_address,
            header: 'Contact',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.email_address}
                </span>
            ),
        },
        {
            id: 'level',
            accessorFn: (row) => row.transcript_metadata.current_level,
            header: 'Level',
            cell: ({ row }) => (
                <span className="text-sm">
                    Level {row.original.transcript_metadata.current_level}
                </span>
            ),
        },
        {
            id: 'actions',
            enableSorting: false,
            cell: ({ row }) => {
                const student = row.original
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                            >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                                <span className="sr-only">Actions</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <CopyMenuItem value={String(student.student_id)} />
                            <DropdownMenuItem
                                onClick={() => onViewTranscript(student)}
                            >
                                <FileText className="mr-2 h-3.5 w-3.5" />
                                View Transcript
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => onActivate(student)}
                            >
                                <UserCheck className="mr-2 h-3.5 w-3.5" />
                                Activate
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}

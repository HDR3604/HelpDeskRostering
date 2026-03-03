import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, FileText, Check, X, Mail, Phone } from 'lucide-react'
import { CopyMenuItem } from '../components/copy-menu-item'
import { CopyableText } from '../components/copyable-text'
import type { Student } from '@/types/student'
import { getApplicationStatus, type ApplicationStatus } from '@/types/student'
import { APPLICATION_STATUS_STYLES } from '@/lib/constants'

const statusOrder: Record<ApplicationStatus, number> = {
    pending: 0,
    accepted: 1,
    rejected: 2,
}

interface StudentColumnCallbacks {
    onAccept: (studentId: number) => void
    onReject: (studentId: number) => void
    onViewTranscript: (student: Student) => void
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(iso))
}

export function getStudentColumns({
    onAccept,
    onReject,
    onViewTranscript,
}: StudentColumnCallbacks): ColumnDef<Student>[] {
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
                `${row.first_name} ${row.last_name} ${row.email_address} ${row.phone_number ?? ''}`,
            header: 'Name',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.first_name} {row.original.last_name}
                    </p>
                    <div className="space-y-0.5">
                        <CopyableText
                            text={row.original.email_address}
                            icon={Mail}
                            className="text-xs text-muted-foreground"
                            iconClassName="h-2.5 w-2.5"
                        />
                        {row.original.phone_number && (
                            <CopyableText
                                text={row.original.phone_number}
                                icon={Phone}
                                className="text-xs text-muted-foreground"
                                iconClassName="h-2.5 w-2.5"
                            />
                        )}
                    </div>
                </div>
            ),
        },
        {
            id: 'programme',
            accessorFn: (row) =>
                `${row.transcript_metadata.current_programme} Level ${row.transcript_metadata.current_year}`,
            header: 'Programme',
            cell: ({ row }) => (
                <div>
                    <p className="text-sm">
                        {row.original.transcript_metadata.current_programme}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Level {row.original.transcript_metadata.current_year}
                    </p>
                </div>
            ),
        },
        {
            id: 'gpa',
            accessorFn: (row) => row.transcript_metadata.overall_gpa,
            header: () => <div className="text-right">GPA</div>,
            cell: ({ row }) => (
                <div className="text-right tabular-nums font-semibold">
                    {(
                        row.original.transcript_metadata.overall_gpa ?? 0
                    ).toFixed(2)}
                </div>
            ),
        },
        {
            id: 'applied',
            accessorFn: (row) => row.created_at,
            header: 'Applied',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.original.created_at)}
                </span>
            ),
        },
        {
            id: 'status',
            accessorFn: (row) => getApplicationStatus(row),
            header: 'Status',
            sortingFn: (rowA, rowB) => {
                const a = statusOrder[getApplicationStatus(rowA.original)]
                const b = statusOrder[getApplicationStatus(rowB.original)]
                return a - b
            },
            cell: ({ row }) => {
                const status = getApplicationStatus(row.original)
                return (
                    <Badge
                        className={`capitalize ${APPLICATION_STATUS_STYLES[status]}`}
                    >
                        {status}
                    </Badge>
                )
            },
        },
        {
            id: 'actions',
            enableSorting: false,
            cell: ({ row }) => {
                const student = row.original
                const status = getApplicationStatus(student)
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
                                disabled={status !== 'pending'}
                                onClick={() => onAccept(student.student_id)}
                            >
                                <Check className="mr-2 h-3.5 w-3.5" />
                                Accept
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                disabled={status !== 'pending'}
                                onClick={() => onReject(student.student_id)}
                            >
                                <X className="mr-2 h-3.5 w-3.5" />
                                Reject
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}

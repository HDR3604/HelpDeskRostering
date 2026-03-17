import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    MoreHorizontal,
    FileText,
    UserMinus,
    UserCheck,
    Mail,
    Phone,
} from 'lucide-react'
import { CopyMenuItem } from '../components/copy-menu-item'
import { CopyableText } from '../components/copyable-text'
import type { Student } from '@/types/student'

export type RosterEntry = Student & { isDeactivated: boolean }

interface RosterColumnCallbacks {
    onDeactivate: (student: Student) => void
    onActivate: (student: Student) => void
    onViewTranscript: (student: Student) => void
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(iso))
}

export function getRosterColumns({
    onDeactivate,
    onActivate,
    onViewTranscript,
}: RosterColumnCallbacks): ColumnDef<RosterEntry>[] {
    return [
        {
            id: 'select',
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Select all"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Select row"
                />
            ),
            enableSorting: false,
        },
        {
            id: 'name',
            accessorFn: (row) =>
                `${row.first_name} ${row.last_name} ${row.email_address} ${row.student_id} ${row.transcript_metadata.current_programme}`,
            header: 'Assistant',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.first_name} {row.original.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {row.original.transcript_metadata.current_programme}{' '}
                        &middot; Level{' '}
                        {row.original.transcript_metadata.current_year}
                    </p>
                </div>
            ),
        },
        {
            id: 'contact',
            accessorFn: (row) =>
                `${row.email_address} ${row.phone_number ?? ''}`,
            header: 'Contact',
            cell: ({ row }) => (
                <div className="space-y-0.5">
                    <CopyableText
                        text={row.original.email_address}
                        icon={Mail}
                        className="text-sm"
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
            id: 'joined',
            accessorFn: (row) => row.accepted_at,
            header: 'Joined',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.accepted_at
                        ? formatDate(row.original.accepted_at)
                        : '—'}
                </span>
            ),
        },
        {
            id: 'status',
            accessorFn: (row) => (row.isDeactivated ? 'deactivated' : 'active'),
            header: 'Status',
            cell: ({ row }) => {
                const deactivated = row.original.isDeactivated
                return (
                    <Badge
                        className={
                            deactivated
                                ? 'bg-muted text-muted-foreground hover:bg-muted'
                                : 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15'
                        }
                    >
                        {deactivated ? 'Deactivated' : 'Active'}
                    </Badge>
                )
            },
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
                            {student.isDeactivated ? (
                                <DropdownMenuItem
                                    onClick={() => onActivate(student)}
                                >
                                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                                    Activate
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={() => onDeactivate(student)}
                                >
                                    <UserMinus className="mr-2 h-3.5 w-3.5" />
                                    Deactivate
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}

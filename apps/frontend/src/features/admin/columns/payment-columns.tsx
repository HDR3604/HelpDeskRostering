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
import { MoreHorizontal, FileText, CheckCircle, Undo2 } from 'lucide-react'
import { CopyMenuItem } from '../components/copy-menu-item'
import type { Student } from '@/types/student'

export const HOURLY_RATE = 20

export type PaymentEntry = {
    paymentId: string
    student: Student
    periodStart: string
    periodEnd: string
    hoursWorked: number
    grossAmount: number
    processedAt: string | null
}

function formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(iso))
}

interface PaymentColumnCallbacks {
    onProcess: (entry: PaymentEntry) => void
    onRevert: (entry: PaymentEntry) => void
    onViewTranscript: (student: Student) => void
}

export function getPaymentColumns(
    callbacks: PaymentColumnCallbacks,
): ColumnDef<PaymentEntry>[] {
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
                `${row.student.first_name} ${row.student.last_name} ${row.student.student_id}`,
            header: 'Assistant',
            cell: ({ row }) => (
                <div>
                    <p className="font-medium">
                        {row.original.student.first_name}{' '}
                        {row.original.student.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {
                            row.original.student.transcript_metadata
                                .current_programme
                        }
                    </p>
                </div>
            ),
        },
        {
            id: 'studentId',
            accessorFn: (row) => row.student.student_id,
            header: 'ID',
            cell: ({ row }) => (
                <span className="font-mono text-xs text-muted-foreground">
                    {row.original.student.student_id}
                </span>
            ),
        },
        {
            id: 'hours',
            accessorKey: 'hoursWorked',
            header: () => <div className="text-right">Hours</div>,
            cell: ({ row }) => (
                <div className="text-right tabular-nums">
                    {row.original.hoursWorked}
                </div>
            ),
        },
        {
            id: 'rate',
            header: () => <div className="text-right">Rate</div>,
            cell: () => (
                <div className="text-right tabular-nums text-muted-foreground">
                    ${HOURLY_RATE.toFixed(2)}
                </div>
            ),
        },
        {
            id: 'amount',
            accessorKey: 'grossAmount',
            header: () => <div className="text-right">Amount</div>,
            cell: ({ row }) => (
                <div className="text-right tabular-nums font-medium">
                    ${row.original.grossAmount.toFixed(2)}
                </div>
            ),
        },
        {
            id: 'status',
            accessorFn: (row) => (row.processedAt ? 'processed' : 'pending'),
            header: 'Status',
            cell: ({ row }) => {
                const processed = !!row.original.processedAt
                return (
                    <Badge
                        className={
                            processed
                                ? 'bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15'
                                : 'bg-muted text-muted-foreground hover:bg-muted'
                        }
                    >
                        {processed ? 'Processed' : 'Pending'}
                    </Badge>
                )
            },
        },
        {
            id: 'processedAt',
            accessorFn: (row) => row.processedAt,
            header: 'Processed',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.processedAt
                        ? formatDate(row.original.processedAt)
                        : '—'}
                </span>
            ),
        },
        {
            id: 'actions',
            enableSorting: false,
            cell: ({ row }) => {
                const entry = row.original
                const isProcessed = !!entry.processedAt
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
                            <CopyMenuItem
                                value={String(entry.student.student_id)}
                            />
                            <DropdownMenuItem
                                onClick={() =>
                                    callbacks.onViewTranscript(entry.student)
                                }
                            >
                                <FileText className="mr-2 h-3.5 w-3.5" />
                                View Transcript
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {isProcessed ? (
                                <DropdownMenuItem
                                    onClick={() => callbacks.onRevert(entry)}
                                >
                                    <Undo2 className="mr-2 h-3.5 w-3.5" />
                                    Revert to Pending
                                </DropdownMenuItem>
                            ) : (
                                <DropdownMenuItem
                                    onClick={() => callbacks.onProcess(entry)}
                                >
                                    <CheckCircle className="mr-2 h-3.5 w-3.5" />
                                    Mark as Processed
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            },
        },
    ]
}

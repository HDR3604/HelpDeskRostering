import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { MoreHorizontal, Flag, FlagOff, MapPin } from 'lucide-react'
import { CopyMenuItem } from '../components/copy-menu-item'
import type { AdminTimeLogResponse } from '@/lib/api/time-logs'

function formatDateTime(iso: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    }).format(new Date(iso))
}

function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${Math.round(meters)} m`
    }
    return `${(meters / 1000).toFixed(1)} km`
}

function formatDuration(entryAt: string, exitAt: string | null): string {
    const end = exitAt ? new Date(exitAt).getTime() : Date.now()
    const diff = end - new Date(entryAt).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return '<1m'
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
}

interface TimeLogColumnCallbacks {
    onFlag: (log: AdminTimeLogResponse) => void
    onUnflag: (log: AdminTimeLogResponse) => void
    onViewLocation: (log: AdminTimeLogResponse) => void
}

export function getTimeLogColumns(
    callbacks: TimeLogColumnCallbacks,
): ColumnDef<AdminTimeLogResponse>[] {
    return [
        {
            id: 'name',
            accessorFn: (row) =>
                `${row.student_name} ${row.student_id} ${row.student_email}`,
            header: 'Student',
            cell: ({ row }) => (
                <div className="min-w-0">
                    <p className="truncate font-medium">
                        {row.original.student_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                        {row.original.student_email}
                    </p>
                </div>
            ),
        },
        {
            id: 'clockIn',
            accessorKey: 'entry_at',
            header: 'Clock In',
            cell: ({ row }) => (
                <span className="text-sm tabular-nums">
                    {formatDateTime(row.original.entry_at)}
                </span>
            ),
        },
        {
            id: 'clockOut',
            accessorKey: 'exit_at',
            header: 'Clock Out',
            cell: ({ row }) =>
                row.original.exit_at ? (
                    <span className="text-sm tabular-nums">
                        {formatDateTime(row.original.exit_at)}
                    </span>
                ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 text-[10px]">
                        On shift
                    </Badge>
                ),
        },
        {
            id: 'duration',
            header: 'Duration',
            cell: ({ row }) => (
                <span className="text-sm tabular-nums text-muted-foreground">
                    {formatDuration(
                        row.original.entry_at,
                        row.original.exit_at,
                    )}
                </span>
            ),
        },
        {
            id: 'distance',
            accessorKey: 'distance_meters',
            header: () => <div className="text-right">Distance</div>,
            cell: ({ row }) => {
                const meters = row.original.distance_meters
                const isClose = meters <= 100
                return (
                    <div className="text-right">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    className={`text-sm tabular-nums cursor-default ${isClose ? 'text-emerald-500' : 'text-amber-500'}`}
                                >
                                    {formatDistance(meters)}
                                </span>
                            </TooltipTrigger>
                            <TooltipContent>
                                {isClose
                                    ? 'Within help desk range'
                                    : 'Outside help desk range'}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                )
            },
        },
        {
            id: 'status',
            accessorFn: (row) => (row.is_flagged ? 'flagged' : 'clear'),
            header: 'Status',
            cell: ({ row }) => {
                const flagged = row.original.is_flagged
                if (flagged) {
                    return (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15 cursor-default">
                                    <Flag className="mr-1 h-3 w-3" />
                                    Flagged
                                </Badge>
                            </TooltipTrigger>
                            {row.original.flag_reason && (
                                <TooltipContent>
                                    <p className="max-w-xs">
                                        {row.original.flag_reason}
                                    </p>
                                </TooltipContent>
                            )}
                        </Tooltip>
                    )
                }
                return (
                    <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                        Clear
                    </Badge>
                )
            },
        },
        {
            id: 'actions',
            enableSorting: false,
            cell: ({ row }) => {
                const log = row.original
                return (
                    <div
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
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
                                <DropdownMenuItem
                                    onClick={() =>
                                        callbacks.onViewLocation(log)
                                    }
                                >
                                    <MapPin className="mr-2 h-3.5 w-3.5" />
                                    View Location
                                </DropdownMenuItem>
                                <CopyMenuItem value={String(log.student_id)} />
                                <DropdownMenuSeparator />
                                {log.is_flagged ? (
                                    <DropdownMenuItem
                                        onClick={() => callbacks.onUnflag(log)}
                                    >
                                        <FlagOff className="mr-2 h-3.5 w-3.5" />
                                        Unflag
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem
                                        onClick={() => callbacks.onFlag(log)}
                                    >
                                        <Flag className="mr-2 h-3.5 w-3.5" />
                                        Flag as Suspicious
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )
            },
        },
    ]
}

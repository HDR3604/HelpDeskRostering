import { useMemo, useState } from 'react'
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Loader2,
    Radio,
    User,
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useTodayTimeLogs } from '@/lib/queries/time-logs'
import type { AdminTimeLog } from '@/types/time-log'

const COLLAPSED_COUNT = 3

interface ActivityEntry {
    id: string
    studentId: number
    name: string
    entryAt: string
    exitAt: string | null
    distanceMeters: number
    isFlagged: boolean
    flagReason?: string
}

function toEntries(logs: AdminTimeLog[]): ActivityEntry[] {
    return logs
        .sort(
            (a, b) =>
                new Date(b.entry_at).getTime() - new Date(a.entry_at).getTime(),
        )
        .map((l) => ({
            id: l.id,
            studentId: l.student_id,
            name: l.student_name,
            entryAt: l.entry_at,
            exitAt: l.exit_at,
            distanceMeters: l.distance_meters,
            isFlagged: l.is_flagged,
            flagReason: l.flag_reason ?? undefined,
        }))
}

function formatSince(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m ago`
}

function formatTimeShort(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
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

export function TimelogStatus() {
    const [expanded, setExpanded] = useState(false)
    const logsQuery = useTodayTimeLogs()

    const entries = useMemo(
        () => toEntries(logsQuery.data?.data ?? []),
        [logsQuery.data],
    )
    const hasMore =
        (logsQuery.data?.total ?? 0) > (logsQuery.data?.data?.length ?? 0)

    const activeCount = entries.filter((e) => e.exitAt === null).length
    const flaggedEntries = entries.filter((e) => e.isFlagged)
    const cleanEntries = entries.filter((e) => !e.isFlagged)

    const allOrdered = [...flaggedEntries, ...cleanEntries]
    const canCollapse = allOrdered.length > COLLAPSED_COUNT
    const hiddenCount = allOrdered.length - COLLAPSED_COUNT

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle className="flex flex-wrap items-center gap-2">
                            Activity
                            {activeCount > 0 && (
                                <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    {activeCount} on shift
                                </Badge>
                            )}
                            {flaggedEntries.length > 0 && (
                                <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15">
                                    {flaggedEntries.length} suspicious
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>Today's time logs</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {logsQuery.isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : entries.length === 0 ? (
                    <div className="flex items-center gap-3 rounded-lg border border-dashed px-4 py-5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                            <Radio className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                No activity yet
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Time logs will appear here as students clock in
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div
                            className={cn(
                                'space-y-1.5 overflow-y-auto p-px transition-[max-height] duration-300 ease-in-out',
                                expanded ? 'max-h-[280px]' : 'max-h-[180px]',
                            )}
                        >
                            {flaggedEntries.length > 0 && (
                                <>
                                    {flaggedEntries.map((entry) => (
                                        <EntryRow
                                            key={entry.id}
                                            entry={entry}
                                        />
                                    ))}
                                    {cleanEntries.length > 0 && (
                                        <div className="border-t" />
                                    )}
                                </>
                            )}
                            {cleanEntries.map((entry) => (
                                <EntryRow key={entry.id} entry={entry} />
                            ))}
                        </div>

                        {canCollapse && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-muted-foreground"
                                onClick={() => setExpanded((e) => !e)}
                            >
                                {expanded ? (
                                    <>
                                        Show less
                                        <ChevronUp className="ml-1 h-3 w-3" />
                                    </>
                                ) : (
                                    <>
                                        Show {hiddenCount} more
                                        <ChevronDown className="ml-1 h-3 w-3" />
                                    </>
                                )}
                            </Button>
                        )}

                        {hasMore && (
                            <p className="text-center text-[11px] text-muted-foreground">
                                Showing latest entries. View all in time logs.
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

function EntryRow({ entry }: { entry: ActivityEntry }) {
    const isActive = entry.exitAt === null

    if (entry.isFlagged) {
        return (
            <div className="group flex items-center gap-3 rounded-lg bg-red-500/10 ring-1 ring-red-500/20 px-3 py-2.5 cursor-pointer transition-colors hover:bg-red-500/15">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{entry.name}</p>
                    <p className="truncate text-xs text-red-500/70">
                        {entry.flagReason ?? 'Suspicious entry'}
                        <span className="ml-2 text-muted-foreground">
                            {formatSince(entry.entryAt)}
                        </span>
                    </p>
                </div>
                <span className="shrink-0 text-[11px] tabular-nums text-red-500/50">
                    {formatDuration(entry.entryAt, entry.exitAt)}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-red-500/50 transition-transform group-hover:translate-x-0.5" />
            </div>
        )
    }

    return (
        <div className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
            <div
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    isActive
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : 'bg-muted text-muted-foreground',
                )}
            >
                <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                    {isActive
                        ? `Clocked in ${formatSince(entry.entryAt)}`
                        : `${formatTimeShort(entry.entryAt)} – ${formatTimeShort(entry.exitAt!)}`}
                </p>
            </div>
            <span
                className={cn(
                    'shrink-0 text-[11px] tabular-nums',
                    isActive
                        ? 'font-medium text-emerald-500'
                        : 'text-muted-foreground',
                )}
            >
                {formatDuration(entry.entryAt, entry.exitAt)}
            </span>
        </div>
    )
}

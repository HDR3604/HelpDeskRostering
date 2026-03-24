import { useMemo, useState } from 'react'
import {
    AlertTriangle,
    ChevronDown,
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

interface ClockedInEntry {
    id: string
    studentId: number
    name: string
    since: string
    distanceMeters: number
    isFlagged: boolean
    flagReason?: string
}

function toEntries(logs: AdminTimeLog[]): ClockedInEntry[] {
    return logs
        .filter((l) => l.exit_at === null)
        .sort(
            (a, b) =>
                new Date(b.entry_at).getTime() - new Date(a.entry_at).getTime(),
        )
        .map((l) => ({
            id: l.id,
            studentId: l.student_id,
            name: l.student_name,
            since: l.entry_at,
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

export function TimelogStatus() {
    const [expanded, setExpanded] = useState(false)
    const logsQuery = useTodayTimeLogs()

    const entries = useMemo(
        () => toEntries(logsQuery.data?.data ?? []),
        [logsQuery.data],
    )
    const hasMore =
        (logsQuery.data?.total ?? 0) > (logsQuery.data?.data?.length ?? 0)

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
                            {entries.length > 0 && (
                                <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    {entries.length} on shift
                                </Badge>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Clocked in students and flagged entries
                        </CardDescription>
                    </div>
                    {flaggedEntries.length > 0 && (
                        <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15">
                            {flaggedEntries.length} suspicious
                        </Badge>
                    )}
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
                                No one clocked in
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Students will appear here when they clock in to
                                their shifts
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div
                            className={cn(
                                'space-y-1.5 overflow-y-auto transition-[max-height] duration-300 ease-in-out',
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

function EntryRow({ entry }: { entry: ClockedInEntry }) {
    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5',
                entry.isFlagged
                    ? 'bg-red-500/10 ring-1 ring-red-500/20'
                    : 'bg-muted/40',
            )}
        >
            <div
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                    entry.isFlagged
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-emerald-500/15 text-emerald-500',
                )}
            >
                {entry.isFlagged ? (
                    <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                    <User className="h-3.5 w-3.5" />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{entry.name}</p>
                <p className="text-xs text-muted-foreground">
                    {entry.isFlagged
                        ? (entry.flagReason ?? 'Suspicious entry')
                        : `Clocked in ${formatSince(entry.since)}`}
                </p>
            </div>
            {entry.isFlagged && (
                <span className="shrink-0 text-[11px] font-medium text-red-500">
                    Review
                </span>
            )}
        </div>
    )
}

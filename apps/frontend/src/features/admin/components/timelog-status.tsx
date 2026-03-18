import { AlertTriangle, Radio, User } from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ClockedInEntry {
    studentId: number
    name: string
    since: string // ISO timestamp
    distanceMeters: number
    isFlagged: boolean
    flagReason?: string
}

interface TimelogStatusProps {
    entries?: ClockedInEntry[]
}

function formatSince(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    return `${hrs}h ${mins % 60}m ago`
}

export function TimelogStatus({ entries = [] }: TimelogStatusProps) {
    const flaggedEntries = entries.filter((e) => e.isFlagged)
    const cleanEntries = entries.filter((e) => !e.isFlagged)

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Activity
                            {entries.length > 0 && (
                                <Badge className="gap-1.5 bg-green-500/15 text-green-500 hover:bg-green-500/15">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
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
            <CardContent>
                {entries.length === 0 ? (
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
                        {/* Flagged entries first */}
                        {flaggedEntries.length > 0 && (
                            <div className="space-y-1.5">
                                {flaggedEntries.map((entry) => (
                                    <EntryRow
                                        key={entry.studentId}
                                        entry={entry}
                                    />
                                ))}
                            </div>
                        )}

                        {/* Divider between flagged and clean */}
                        {flaggedEntries.length > 0 &&
                            cleanEntries.length > 0 && (
                                <div className="border-t" />
                            )}

                        {/* Clean entries */}
                        {cleanEntries.length > 0 && (
                            <div className="space-y-1.5">
                                {cleanEntries.map((entry) => (
                                    <EntryRow
                                        key={entry.studentId}
                                        entry={entry}
                                    />
                                ))}
                            </div>
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
                        : 'bg-green-500/15 text-green-500',
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

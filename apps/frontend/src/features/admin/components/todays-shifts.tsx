import { useMemo, useState } from 'react'
import { Clock, Coffee, ChevronDown, ChevronUp, User } from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { Assignment } from '@/types/schedule'

interface TodaysShiftsProps {
    assignments: Assignment[]
    studentNames: Record<string, string>
}

const DAY_NAMES = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
]

function formatTime(time: string): string {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return m
        ? `${hour}:${String(m).padStart(2, '0')} ${period}`
        : `${hour} ${period}`
}

function isCurrentShift(start: string, end: string): boolean {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    const startMin = sh * 60 + (sm || 0)
    const endMin = eh * 60 + (em || 0)
    return currentMinutes >= startMin && currentMinutes < endMin
}

function isPastShift(end: string): boolean {
    const now = new Date()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const [eh, em] = end.split(':').map(Number)
    const endMin = eh * 60 + (em || 0)
    return currentMinutes >= endMin
}

const COLLAPSED_COUNT = 5

export function TodaysShifts({ assignments, studentNames }: TodaysShiftsProps) {
    const now = new Date()
    const scheduleDay = (now.getDay() + 6) % 7
    const dayName = DAY_NAMES[now.getDay()]
    const [expanded, setExpanded] = useState(false)

    const todaysShifts = useMemo(() => {
        return assignments
            .filter((a) => a.day_of_week === scheduleDay)
            .map((a) => ({
                id: `${a.assistant_id}-${a.start}`,
                name: studentNames[a.assistant_id] || `#${a.assistant_id}`,
                start: a.start,
                end: a.end,
                isCurrent: isCurrentShift(a.start, a.end),
                isPast: isPastShift(a.end),
            }))
            .sort((a, b) => {
                // Active first, then upcoming, then past
                if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
                if (a.isPast !== b.isPast) return a.isPast ? 1 : -1
                return a.start.localeCompare(b.start)
            })
    }, [assignments, scheduleDay, studentNames])

    const currentCount = todaysShifts.filter((s) => s.isCurrent).length
    const upcomingCount = todaysShifts.filter(
        (s) => !s.isCurrent && !s.isPast,
    ).length
    const canCollapse = todaysShifts.length > COLLAPSED_COUNT
    const visibleShifts =
        canCollapse && !expanded
            ? todaysShifts.slice(0, COLLAPSED_COUNT)
            : todaysShifts
    const hiddenCount = todaysShifts.length - COLLAPSED_COUNT

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            Today's Shifts
                        </CardTitle>
                        <CardDescription>{dayName}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        {upcomingCount > 0 && (
                            <Badge
                                variant="outline"
                                className="text-muted-foreground"
                            >
                                {upcomingCount} upcoming
                            </Badge>
                        )}
                        {currentCount > 0 && (
                            <Badge className="gap-1.5 bg-green-500/15 text-green-500 hover:bg-green-500/15">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                                </span>
                                {currentCount} active
                            </Badge>
                        )}
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1">
                {todaysShifts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                            <Coffee className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="mt-3 text-sm font-medium">
                            No shifts today
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Enjoy the day off
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Shift timeline */}
                        <ScrollArea
                            className={cn(
                                canCollapse && expanded && 'max-h-[280px]',
                            )}
                        >
                            <div className="space-y-1">
                                {visibleShifts.map((shift) => (
                                    <div
                                        key={shift.id}
                                        className={cn(
                                            'group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                                            shift.isCurrent &&
                                                'bg-green-500/10 border border-green-500/20',
                                            shift.isPast &&
                                                !shift.isCurrent &&
                                                'opacity-50',
                                            !shift.isCurrent &&
                                                !shift.isPast &&
                                                'bg-muted/40',
                                        )}
                                    >
                                        {/* Avatar / status indicator */}
                                        <div
                                            className={cn(
                                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                                shift.isCurrent
                                                    ? 'bg-green-500/20 text-green-500'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <User className="h-3.5 w-3.5" />
                                        </div>

                                        {/* Name + time */}
                                        <div className="min-w-0 flex-1">
                                            <p
                                                className={cn(
                                                    'truncate text-sm font-medium',
                                                    shift.isPast &&
                                                        !shift.isCurrent &&
                                                        'text-muted-foreground',
                                                )}
                                            >
                                                {shift.name}
                                            </p>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="h-3 w-3 shrink-0" />
                                                <span className="tabular-nums">
                                                    {formatTime(shift.start)} –{' '}
                                                    {formatTime(shift.end)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status */}
                                        {shift.isCurrent && (
                                            <span className="shrink-0 text-[11px] font-medium text-green-500">
                                                On shift
                                            </span>
                                        )}
                                        {shift.isPast && !shift.isCurrent && (
                                            <span className="shrink-0 text-[11px] text-muted-foreground">
                                                Done
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>

                        {/* Show more / less */}
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
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

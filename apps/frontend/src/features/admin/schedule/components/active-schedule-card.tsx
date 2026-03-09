import {
    CalendarDays,
    MoreHorizontal,
    Pencil,
    Download,
    Type,
    Archive,
    ZapOff,
    Bell,
    ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDateRange } from '@/lib/format'
import type { ScheduleResponse } from '@/types/schedule'

interface ActiveScheduleCardProps {
    schedule: ScheduleResponse
    stats: { totalStudents: number; totalAssignments: number }
    onOpen: (id: string) => void
    onRename: (s: ScheduleResponse) => void
    onDownload: (s: ScheduleResponse) => void
    onArchive: (s: ScheduleResponse) => void
    onDeactivate: (s: ScheduleResponse) => void
    onNotify: (s: ScheduleResponse) => void
}

export function ActiveScheduleCard({
    schedule,
    stats,
    onOpen,
    onRename,
    onDownload,
    onArchive,
    onDeactivate,
    onNotify,
}: ActiveScheduleCardProps) {
    return (
        <Card
            className="group cursor-pointer overflow-hidden transition-colors hover:bg-muted/40"
            onClick={() => onOpen(schedule.schedule_id)}
        >
            <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                {/* Icon */}
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                    <CalendarDays className="size-5 text-emerald-500" />
                </div>

                {/* Title + meta */}
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">
                            {schedule.title}
                        </h3>
                        <Badge className="shrink-0 bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15 dark:text-emerald-400 text-[11px]">
                            Active
                        </Badge>
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <span>
                            {formatDateRange(
                                schedule.effective_from,
                                schedule.effective_to,
                            )}
                        </span>
                        <span className="text-border">·</span>
                        <span>
                            <span className="tabular-nums font-medium">
                                {stats.totalStudents}
                            </span>{' '}
                            students
                        </span>
                        <span className="text-border">·</span>
                        <span>
                            <span className="tabular-nums font-medium">
                                {stats.totalAssignments}
                            </span>{' '}
                            shifts
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            asChild
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8"
                            >
                                <MoreHorizontal className="size-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onOpen(schedule.schedule_id)
                                }}
                            >
                                <Pencil className="mr-2 size-3.5" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onRename(schedule)
                                }}
                            >
                                <Type className="mr-2 size-3.5" />
                                Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDownload(schedule)
                                }}
                            >
                                <Download className="mr-2 size-3.5" />
                                Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onNotify(schedule)
                                }}
                            >
                                <Bell className="mr-2 size-3.5" />
                                Notify
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onDeactivate(schedule)
                                }}
                            >
                                <ZapOff className="mr-2 size-3.5" />
                                Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onArchive(schedule)
                                }}
                            >
                                <Archive className="mr-2 size-3.5" />
                                Archive
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <ArrowRight className="size-4 text-muted-foreground/50 transition-colors group-hover:text-foreground" />
                </div>
            </div>
        </Card>
    )
}

import {
  CalendarDays,
  MoreHorizontal,
  Pencil,
  Download,
  Type,
  Archive,
  ExternalLink,
  ZapOff,
  Bell,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDateRange } from "@/lib/format"
import type { ScheduleResponse } from "@/types/schedule"

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
      className="group cursor-pointer overflow-hidden border-l-2 border-l-emerald-500 transition-colors hover:bg-muted/50"
      onClick={() => onOpen(schedule.schedule_id)}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <CalendarDays className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{schedule.title}</span>
              <Badge className="shrink-0 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 text-[11px]">Active</Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDateRange(schedule.effective_from, schedule.effective_to)}</span>
              <span className="text-border">·</span>
              <span><span className="tabular-nums">{stats.totalStudents}</span> students</span>
              <span className="text-border">·</span>
              <span><span className="tabular-nums">{stats.totalAssignments}</span> shifts</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(schedule.schedule_id) }}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(schedule) }}>
                <Type className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(schedule) }}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNotify(schedule) }}>
                <Bell className="mr-2 h-3.5 w-3.5" />
                Notify
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeactivate(schedule) }}>
                <ZapOff className="mr-2 h-3.5 w-3.5" />
                Deactivate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(schedule) }}>
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </Card>
  )
}

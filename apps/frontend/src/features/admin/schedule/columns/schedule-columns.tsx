import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Pencil, Type, Download, Archive, Zap } from "lucide-react"
import type { ScheduleResponse } from "@/types/schedule"

type ScheduleStatus = "active" | "archived" | "draft"

function getStatus(schedule: ScheduleResponse): ScheduleStatus {
  if (schedule.is_active) return "active"
  if (schedule.archived_at) return "archived"
  return "draft"
}

const scheduleStatusStyle: Record<ScheduleStatus, string> = {
  active: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15",
  draft: "bg-blue-500/15 text-blue-500 hover:bg-blue-500/15",
  archived: "bg-muted text-muted-foreground hover:bg-muted",
}

function formatDateRange(from: string, to: string | null): string {
  return from + (to ? ` — ${to}` : " onwards")
}

interface ScheduleColumnCallbacks {
  onOpen: (id: string) => void
  onRename: (s: ScheduleResponse) => void
  onSetActive: (s: ScheduleResponse) => void
  onDownload: (s: ScheduleResponse) => void
  onArchive: (s: ScheduleResponse) => void
}

export function getScheduleColumns({ onOpen, onRename, onSetActive, onDownload, onArchive }: ScheduleColumnCallbacks): ColumnDef<ScheduleResponse>[] {
  return [
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => (
        <span className="font-medium">{row.original.title}</span>
      ),
    },
    {
      id: "dateRange",
      header: "Date Range",
      accessorFn: (row) => formatDateRange(row.effective_from, row.effective_to),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatDateRange(row.original.effective_from, row.original.effective_to)}
        </span>
      ),
    },
    {
      id: "students",
      header: () => <div className="text-center">Students</div>,
      accessorFn: (row) => new Set(row.assignments.map((a) => a.assistant_id)).size,
      cell: ({ getValue }) => (
        <div className="text-center">{getValue<number>()}</div>
      ),
    },
    {
      id: "assignments",
      header: () => <div className="text-center">Assignments</div>,
      accessorFn: (row) => row.assignments.length,
      cell: ({ getValue }) => (
        <div className="text-center">{getValue<number>()}</div>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => getStatus(row),
      header: "Status",
      cell: ({ row }) => {
        const status = getStatus(row.original)
        return (
          <Badge className={`capitalize ${scheduleStatusStyle[status]}`}>
            {status}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const schedule = row.original
        return (
          <div className="text-right">
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
                <DropdownMenuSeparator />
                {!schedule.is_active && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSetActive(schedule) }}>
                    <Zap className="mr-2 h-3.5 w-3.5" />
                    Set Active
                  </DropdownMenuItem>
                )}
                {!schedule.archived_at && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(schedule) }}>
                    <Archive className="mr-2 h-3.5 w-3.5" />
                    Archive
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

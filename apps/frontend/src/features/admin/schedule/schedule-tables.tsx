import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTable } from "@/components/ui/data-table"
import { getScheduleColumns } from "./columns/schedule-columns"
import type { ScheduleResponse } from "@/types/schedule"

interface ScheduleTablesProps {
  schedules: ScheduleResponse[]
  columns: ReturnType<typeof getScheduleColumns>
  onOpenSchedule: (id: string) => void
}

export function ScheduleTables({ schedules, columns, onOpenSchedule }: ScheduleTablesProps) {
  const [open, setOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState("all")

  const sorted = useMemo(
    () => [...schedules].sort((a, b) => {
      const aArchived = a.archived_at ? 1 : 0
      const bArchived = b.archived_at ? 1 : 0
      if (aArchived !== bArchived) return aArchived - bArchived
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }),
    [schedules],
  )

  const columnFilters = statusFilter !== "all"
    ? [{ id: "status", value: statusFilter }]
    : []

  const showSearch = schedules.length > 5

  const filterSelect = (
    <Select value={statusFilter} onValueChange={setStatusFilter}>
      <SelectTrigger className="h-8 w-[130px] text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All statuses</SelectItem>
        <SelectItem value="inactive">Inactive</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  )

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
          <span>Past Schedules</span>
          <Badge className="bg-muted text-muted-foreground hover:bg-muted text-xs">{schedules.length}</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        <Card>
          <CardContent className="pt-4">
            <DataTable
              columns={columns}
              data={sorted}
              columnFilters={columnFilters}
              toolbarSlot={filterSelect}
              {...(showSearch ? { searchPlaceholder: "Search...", globalFilter: true } : {})}
              pageSize={5}
              onRowClick={(row) => onOpenSchedule(row.schedule_id)}
              emptyMessage="No schedules."
            />
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}

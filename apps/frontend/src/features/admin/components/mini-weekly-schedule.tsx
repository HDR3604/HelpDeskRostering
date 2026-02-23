import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { WEEKDAYS_SHORT, getTodayWeekdayIndex } from "@/lib/constants"
import { formatHour } from "@/lib/format"
import { ChevronDown, ChevronUp, CalendarDays, Users, Layers } from "lucide-react"
import type { Assignment, ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"
import { STUDENT_COLORS } from "../schedule/types"

interface MiniWeeklyScheduleProps {
  schedule: ScheduleResponse | null
  shiftTemplates: ShiftTemplate[]
  studentNames: Record<string, string>
}

const MAX_VISIBLE_PER_DAY = 4

export function MiniWeeklySchedule({ schedule, shiftTemplates, studentNames }: MiniWeeklyScheduleProps) {
  const [expanded, setExpanded] = useState(false)

  if (!schedule || schedule.assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <p className="text-sm text-muted-foreground">No schedule data available</p>
        </CardHeader>
      </Card>
    )
  }

  const uniqueStudentIds = Array.from(new Set(schedule.assignments.map((a) => a.assistant_id)))
  const studentColorIndex = Object.fromEntries(
    uniqueStudentIds.map((id, i) => [id, i % STUDENT_COLORS.length])
  )

  // Group assignments by day, sorted by start time
  const byDay: Record<number, Assignment[]> = {}
  for (const a of schedule.assignments) {
    if (!byDay[a.day_of_week]) byDay[a.day_of_week] = []
    byDay[a.day_of_week].push(a)
  }
  for (const day of Object.keys(byDay)) {
    byDay[Number(day)].sort((a, b) => a.start.localeCompare(b.start))
  }

  const today = getTodayWeekdayIndex()

  const hasOverflow = Object.values(byDay).some((d) => d.length > MAX_VISIBLE_PER_DAY)

  const MAX_LEGEND_VISIBLE = 8
  const hasLegendOverflow = uniqueStudentIds.length > MAX_LEGEND_VISIBLE
  const visibleLegend = hasLegendOverflow && !expanded
    ? uniqueStudentIds.slice(0, MAX_LEGEND_VISIBLE)
    : uniqueStudentIds

  const stats = [
    { icon: CalendarDays, label: schedule.effective_from + (schedule.effective_to ? ` — ${schedule.effective_to}` : " onwards") },
    { icon: Users, label: `${uniqueStudentIds.length} students` },
    { icon: Layers, label: `${schedule.assignments.length} assignments` },
  ]

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{schedule.title}</CardTitle>
            <p className="text-sm text-muted-foreground">Active schedule overview</p>
          </div>
          <Badge className="shrink-0 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">Active</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {stats.map((s) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <s.icon className="h-3.5 w-3.5" />
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-5 gap-2">
          {WEEKDAYS_SHORT.map((day, idx) => {
            const isToday = idx === today
            const dayAssignments = byDay[idx] || []
            const visible = expanded ? dayAssignments : dayAssignments.slice(0, MAX_VISIBLE_PER_DAY)
            const overflow = dayAssignments.length - MAX_VISIBLE_PER_DAY

            return (
              <div key={day} className="space-y-1.5">
                <div
                  className={cn(
                    "text-center text-xs font-medium py-1.5 rounded-md",
                    isToday
                      ? "bg-foreground/[0.06] text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {day}
                </div>

                {dayAssignments.length > 0 ? (
                  <div className="space-y-1">
                    {visible.map((a) => {
                      const color = STUDENT_COLORS[studentColorIndex[a.assistant_id]]
                      const name = studentNames[a.assistant_id] || a.assistant_id.slice(0, 6)
                      const initials = name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")

                      return (
                        <div
                          key={`${a.assistant_id}-${a.shift_id}`}
                          title={`${name}\n${formatHour(a.start)} – ${formatHour(a.end)}`}
                          className={cn(
                            "rounded-md border-l-2 px-2 py-1.5 text-xs leading-tight",
                            color.chip
                          )}
                        >
                          <span className="font-semibold">{initials}</span>
                          <span className="block text-[11px] opacity-70">{a.start.slice(0, 5)}</span>
                        </div>
                      )
                    })}
                    {!expanded && overflow > 0 && (
                      <div className="rounded-md bg-muted/50 py-1 text-center text-[11px] font-medium text-muted-foreground">
                        +{overflow} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex min-h-[2.5rem] items-center justify-center">
                    <span className="text-xs text-muted-foreground/30">—</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {hasOverflow && (
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => setExpanded((e) => !e)}
            >
              {expanded ? (
                <>Show less <ChevronUp className="ml-1 h-3.5 w-3.5" /></>
              ) : (
                <>Show all <ChevronDown className="ml-1 h-3.5 w-3.5" /></>
              )}
            </Button>
          </div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 border-t pt-3">
          {visibleLegend.map((id) => {
            const color = STUDENT_COLORS[studentColorIndex[id]]
            const name = studentNames[id] || id.slice(0, 8)
            return (
              <div key={id} className="flex items-center gap-1.5 text-xs">
                <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", color.dot)} />
                <span className="truncate max-w-[7rem]">{name}</span>
              </div>
            )
          })}
          {hasLegendOverflow && !expanded && (
            <span className="text-xs text-muted-foreground">
              +{uniqueStudentIds.length - MAX_LEGEND_VISIBLE} more
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

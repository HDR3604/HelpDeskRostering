import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Assignment, ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface MiniWeeklyScheduleProps {
  schedule: ScheduleResponse | null
  shiftTemplates: ShiftTemplate[]
  studentNames: Record<string, string>
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const TIME_SLOTS = ["Morning", "Afternoon"]

// Deterministic color classes for students based on index
const STUDENT_COLORS = [
  "bg-chart-1/20 text-chart-1 border-chart-1/40",
  "bg-chart-2/20 text-chart-2 border-chart-2/40",
  "bg-chart-3/20 text-chart-3 border-chart-3/40",
  "bg-chart-4/20 text-chart-4 border-chart-4/40",
  "bg-chart-5/20 text-chart-5 border-chart-5/40",
]

const LEGEND_DOTS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
]

function getSlot(time: string): "Morning" | "Afternoon" {
  const hour = parseInt(time.split(":")[0], 10)
  return hour < 12 ? "Morning" : "Afternoon"
}

export function MiniWeeklySchedule({ schedule, shiftTemplates, studentNames }: MiniWeeklyScheduleProps) {
  if (!schedule || schedule.assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Weekly Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No schedule data available</p>
        </CardContent>
      </Card>
    )
  }

  // Build a unique list of students for color assignment
  const uniqueStudentIds = Array.from(new Set(schedule.assignments.map((a) => a.assistant_id)))
  const studentColorIndex = Object.fromEntries(
    uniqueStudentIds.map((id, i) => [id, i % STUDENT_COLORS.length])
  )

  // Group assignments by day + slot
  const grid: Record<string, Assignment[]> = {}
  for (const a of schedule.assignments) {
    const key = `${a.day_of_week}-${getSlot(a.start)}`
    if (!grid[key]) grid[key] = []
    grid[key].push(a)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Weekly Schedule</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="py-1.5 pr-2 text-left font-medium text-muted-foreground"></th>
                {DAYS.map((day) => (
                  <th key={day} className="py-1.5 px-1 text-center font-medium text-muted-foreground">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="py-2 pr-2 text-right font-medium text-muted-foreground whitespace-nowrap">
                    {slot}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx}-${slot}`
                    const cellAssignments = grid[key] || []
                    return (
                      <td key={dayIdx} className="p-1">
                        <div className="flex min-h-[2rem] flex-wrap gap-0.5 rounded-md border border-dashed border-border p-1">
                          {cellAssignments.map((a) => {
                            const colorIdx = studentColorIndex[a.assistant_id]
                            const name = studentNames[a.assistant_id] || a.assistant_id.slice(0, 6)
                            const initials = name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                            return (
                              <span
                                key={`${a.assistant_id}-${a.shift_id}`}
                                title={`${name}\n${a.start.slice(0, 5)} – ${a.end.slice(0, 5)}`}
                                className={cn(
                                  "inline-flex items-center rounded border px-1 py-0.5 text-[10px] font-medium leading-none",
                                  STUDENT_COLORS[colorIdx]
                                )}
                              >
                                {initials}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 border-t pt-3">
          {uniqueStudentIds.map((id) => {
            const colorIdx = studentColorIndex[id]
            const name = studentNames[id] || id.slice(0, 8)
            return (
              <div key={id} className="flex items-center gap-1.5 text-xs">
                <span className={cn("h-2.5 w-2.5 rounded-full", LEGEND_DOTS[colorIdx])} />
                <span>{name}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

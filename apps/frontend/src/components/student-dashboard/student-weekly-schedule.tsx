import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Assignment } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface StudentWeeklyScheduleProps {
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const TIME_SLOTS = ["Morning", "Afternoon"] as const

function getSlot(time: string): "Morning" | "Afternoon" {
  const hour = parseInt(time.split(":")[0], 10)
  return hour < 12 ? "Morning" : "Afternoon"
}

function formatTime(t: string) {
  const hour = parseInt(t.split(":")[0], 10)
  const min = t.split(":")[1] || "00"
  if (hour === 12) return `12:${min}`
  return hour < 12 ? `${hour}:${min}` : `${hour - 12}:${min}`
}

export function StudentWeeklySchedule({ assignments, shiftTemplates }: StudentWeeklyScheduleProps) {
  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>No shifts assigned this week</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Group assignments by day + slot
  const grid: Record<string, Assignment[]> = {}
  for (const a of assignments) {
    const key = `${a.day_of_week}-${getSlot(a.start)}`
    if (!grid[key]) grid[key] = []
    grid[key].push(a)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly Schedule</CardTitle>
        <CardDescription>Your shift assignments for the week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left font-medium text-muted-foreground" />
                {DAYS.map((day) => (
                  <th key={day} className="py-2 px-2 text-center font-medium text-muted-foreground">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map((slot) => (
                <tr key={slot}>
                  <td className="py-3 pr-3 text-right font-medium text-muted-foreground whitespace-nowrap">
                    {slot}
                  </td>
                  {DAYS.map((_, dayIdx) => {
                    const key = `${dayIdx}-${slot}`
                    const cellAssignments = grid[key] || []
                    const hasShift = cellAssignments.length > 0

                    return (
                      <td key={dayIdx} className="p-1">
                        <div
                          className={cn(
                            "flex min-h-[3.5rem] flex-col items-center justify-center rounded-lg border p-2",
                            hasShift
                              ? "border-primary/30 bg-primary/10"
                              : "border-dashed border-border"
                          )}
                        >
                          {cellAssignments.map((a) => {
                            const template = shiftTemplates.find((t) => t.id === a.shift_id)
                            return (
                              <div key={a.shift_id} className="text-center">
                                <p className="text-xs font-medium text-primary">
                                  {template?.name ?? "Shift"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatTime(a.start)} – {formatTime(a.end)}
                                </p>
                              </div>
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
      </CardContent>
    </Card>
  )
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock } from "lucide-react"
import type { Assignment } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface NextShiftCardProps {
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

function getNextAssignment(assignments: Assignment[]): Assignment | null {
  if (assignments.length === 0) return null

  const now = new Date()
  // JS: 0=Sun, 1=Mon … 6=Sat → convert to 0=Mon … 4=Fri
  const jsDay = now.getDay()
  const today = jsDay === 0 ? 6 : jsDay - 1
  const currentHour = now.getHours()

  // Sort by day_of_week then start time
  const sorted = [...assignments].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return a.start.localeCompare(b.start)
  })

  // Find first shift that hasn't ended yet
  for (const a of sorted) {
    const endHour = parseInt(a.end.split(":")[0], 10)
    if (a.day_of_week > today || (a.day_of_week === today && endHour > currentHour)) {
      return a
    }
  }

  // If all shifts are past this week, wrap around to next week's first
  return sorted[0]
}

function formatTime(t: string) {
  const hour = parseInt(t.split(":")[0], 10)
  return hour <= 12 ? `${hour}:00 AM` : `${hour - 12}:00 PM`
}

function getShiftDuration(start: string, end: string): number {
  const startH = parseInt(start.split(":")[0], 10)
  const endH = parseInt(end.split(":")[0], 10)
  return endH - startH
}

export function NextShiftCard({ assignments, shiftTemplates }: NextShiftCardProps) {
  const next = getNextAssignment(assignments)

  if (!next) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Shift</CardTitle>
          <CardDescription>No upcoming shifts scheduled</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const template = shiftTemplates.find((t) => t.id === next.shift_id)
  const shiftName = template?.name ?? "Shift"
  const duration = getShiftDuration(next.start, next.end)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Shift</CardTitle>
        <CardDescription>Your upcoming helpdesk shift</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">{shiftName}</p>
          <Badge className="bg-muted text-muted-foreground hover:bg-muted">{duration} hrs</Badge>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>{DAY_NAMES[next.day_of_week]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatTime(next.start)} – {formatTime(next.end)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

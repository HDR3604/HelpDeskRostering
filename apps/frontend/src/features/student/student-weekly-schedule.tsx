import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CalendarPlus, Clock } from "lucide-react"
import type { Assignment, ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface StudentWeeklyScheduleProps {
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
  schedule: ScheduleResponse
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

function formatTime12(t: string) {
  const hour = parseInt(t.split(":")[0], 10)
  if (hour === 12) return "12 PM"
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

function getShiftHours(start: string, end: string): number {
  return parseInt(end.split(":")[0], 10) - parseInt(start.split(":")[0], 10)
}

/** Build an .ics file string for all assignments in the schedule week */
function buildIcs(assignments: Assignment[], shiftTemplates: ShiftTemplate[], schedule: ScheduleResponse): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HelpDesk Rostering//EN",
    "CALSCALE:GREGORIAN",
  ]

  const weekStart = new Date(schedule.effective_from + "T00:00:00")

  for (const a of assignments) {
    const template = shiftTemplates.find((t) => t.id === a.shift_id)
    const eventDate = new Date(weekStart)
    eventDate.setDate(weekStart.getDate() + a.day_of_week)

    const startParts = a.start.split(":")
    const endParts = a.end.split(":")

    const dtStart = formatIcsDate(eventDate, parseInt(startParts[0], 10), parseInt(startParts[1], 10))
    const dtEnd = formatIcsDate(eventDate, parseInt(endParts[0], 10), parseInt(endParts[1], 10))

    lines.push(
      "BEGIN:VEVENT",
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:Helpdesk — ${template?.name ?? "Shift"}`,
      `DESCRIPTION:${FULL_DAYS[a.day_of_week]} ${formatTime12(a.start)} – ${formatTime12(a.end)}`,
      `UID:${schedule.schedule_id}-${a.shift_id}-${a.day_of_week}@helpdesk`,
      "END:VEVENT",
    )
  }

  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

function formatIcsDate(date: Date, hour: number, minute: number): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(hour).padStart(2, "0")
  const min = String(minute).padStart(2, "0")
  return `${y}${m}${d}T${h}${min}00`
}

function downloadIcs(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function StudentWeeklySchedule({ assignments, shiftTemplates, schedule }: StudentWeeklyScheduleProps) {
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

  // Group assignments by day, sorted by start time
  const byDay: Record<number, Assignment[]> = {}
  for (const a of assignments) {
    if (!byDay[a.day_of_week]) byDay[a.day_of_week] = []
    byDay[a.day_of_week].push(a)
  }
  for (const day of Object.keys(byDay)) {
    byDay[Number(day)].sort((a, b) => a.start.localeCompare(b.start))
  }

  // Check which day is today (0=Mon)
  const jsDay = new Date().getDay()
  const today = jsDay === 0 ? 6 : jsDay - 1

  function handleExportCalendar() {
    const ics = buildIcs(assignments, shiftTemplates, schedule)
    downloadIcs(ics, `helpdesk-schedule-${schedule.effective_from}.ics`)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Your shift assignments for the week</CardDescription>
        </div>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleExportCalendar}>
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
          Add to Calendar
        </Button>
      </CardHeader>
      <CardContent>
        {/* Desktop: column grid */}
        <div className="hidden sm:grid sm:grid-cols-5 sm:gap-2">
          {DAYS.map((day, idx) => {
            const isToday = idx === today
            const dayAssignments = byDay[idx] || []

            return (
              <div key={day} className="space-y-1.5">
                <div
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium",
                    isToday
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground"
                  )}
                >
                  {day}
                  {isToday && (
                    <span className="text-[10px] font-normal opacity-80">Today</span>
                  )}
                </div>

                {dayAssignments.length > 0 ? (
                  dayAssignments.map((a) => {
                    const template = shiftTemplates.find((t) => t.id === a.shift_id)
                    const hours = getShiftHours(a.start, a.end)
                    return (
                      <div
                        key={a.shift_id}
                        className={cn(
                          "rounded-md border-l-[3px] border-l-primary bg-primary/5 px-2.5 py-2",
                          isToday && "bg-primary/10"
                        )}
                      >
                        <p className="text-xs font-semibold text-foreground">
                          {template?.name ?? "Shift"}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatTime12(a.start)} – {formatTime12(a.end)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {hours} {hours === 1 ? "hour" : "hours"}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex min-h-[4rem] items-center justify-center rounded-md border border-dashed border-border/40">
                    <span className="text-[10px] text-muted-foreground/40">No shift</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: vertical day list */}
        <div className="space-y-2 sm:hidden">
          {DAYS.map((day, idx) => {
            const isToday = idx === today
            const dayAssignments = byDay[idx] || []
            if (dayAssignments.length === 0) return null

            return (
              <div
                key={day}
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  isToday ? "border-primary/30 bg-primary/5" : "border-border"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-semibold",
                    isToday ? "text-primary" : "text-foreground"
                  )}>
                    {FULL_DAYS[idx]}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Today
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {dayAssignments.map((a) => {
                    const template = shiftTemplates.find((t) => t.id === a.shift_id)
                    const hours = getShiftHours(a.start, a.end)
                    return (
                      <div
                        key={a.shift_id}
                        className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
                      >
                        <div>
                          <p className="text-xs font-semibold">{template?.name ?? "Shift"}</p>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatTime12(a.start)} – {formatTime12(a.end)}</span>
                          </div>
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {hours}h
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

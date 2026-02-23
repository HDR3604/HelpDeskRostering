import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { CalendarPlus, Clock } from "lucide-react"
import { WEEKDAYS_SHORT, WEEKDAYS_FULL, getTodayWeekdayIndex } from "@/lib/constants"
import { formatHour, getShiftDuration } from "@/lib/format"
import type { Assignment, ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface StudentWeeklyScheduleProps {
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
  schedule: ScheduleResponse
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
      `DESCRIPTION:${WEEKDAYS_FULL[a.day_of_week]} ${formatHour(a.start)} – ${formatHour(a.end)}`,
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

  const today = getTodayWeekdayIndex()

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
          {WEEKDAYS_SHORT.map((day, idx) => {
            const isToday = idx === today
            const dayAssignments = byDay[idx] || []

            return (
              <div key={day} className={cn("space-y-1.5 rounded-lg px-1.5 py-1.5", isToday && "bg-foreground/[0.03]")}>
                <div
                  className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium",
                    isToday
                      ? "text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {day}
                  {isToday && (
                    <span className="text-[10px] font-normal text-muted-foreground">Today</span>
                  )}
                </div>

                {dayAssignments.length > 0 ? (
                  dayAssignments.map((a) => {
                    const template = shiftTemplates.find((t) => t.id === a.shift_id)
                    const hours = getShiftDuration(a.start, a.end)
                    return (
                      <div
                        key={a.shift_id}
                        className="rounded-md border-l-[3px] border-l-primary bg-primary/10 dark:bg-primary/15 px-2.5 py-2"
                      >
                        <p className="text-xs font-semibold text-foreground">
                          {template?.name ?? "Shift"}
                        </p>
                        <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span>{formatHour(a.start)} – {formatHour(a.end)}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {hours} {hours === 1 ? "hour" : "hours"}
                        </p>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex min-h-[4rem] items-center justify-center rounded-md bg-muted/50">
                    <span className="text-[11px] text-muted-foreground">No shift</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Mobile: vertical day list */}
        <div className="space-y-2 sm:hidden">
          {WEEKDAYS_SHORT.map((day, idx) => {
            const isToday = idx === today
            const dayAssignments = byDay[idx] || []
            if (dayAssignments.length === 0) return null

            return (
              <div
                key={day}
                className={cn(
                  "rounded-lg border px-3 py-2.5",
                  isToday ? "border-foreground/10 bg-foreground/[0.03]" : "border-border"
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {WEEKDAYS_FULL[idx]}
                  </span>
                  {isToday && (
                    <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-foreground">
                      Today
                    </span>
                  )}
                </div>
                <div className="mt-1.5 space-y-1.5">
                  {dayAssignments.map((a) => {
                    const template = shiftTemplates.find((t) => t.id === a.shift_id)
                    const hours = getShiftDuration(a.start, a.end)
                    return (
                      <div
                        key={a.shift_id}
                        className="flex items-center justify-between rounded-md bg-primary/10 dark:bg-primary/15 px-3 py-1.5"
                      >
                        <div>
                          <p className="text-xs font-semibold">{template?.name ?? "Shift"}</p>
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{formatHour(a.start)} – {formatHour(a.end)}</span>
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

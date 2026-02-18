import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { CalendarPlus } from "lucide-react"
import type { Assignment, ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface StudentWeeklyScheduleProps {
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
  schedule: ScheduleResponse
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const FULL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const TIME_SLOTS = ["Morning", "Afternoon"] as const

function getSlot(time: string): "Morning" | "Afternoon" {
  const hour = parseInt(time.split(":")[0], 10)
  return hour < 12 ? "Morning" : "Afternoon"
}

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

  // effective_from is a date string like "2026-02-17" (the Monday of the week)
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

  // Group assignments by day + slot
  const grid: Record<string, Assignment[]> = {}
  for (const a of assignments) {
    const key = `${a.day_of_week}-${getSlot(a.start)}`
    if (!grid[key]) grid[key] = []
    grid[key].push(a)
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
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Your shift assignments for the week</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCalendar}>
          <CalendarPlus className="mr-1.5 h-3.5 w-3.5" />
          Add to Calendar
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="py-2 pr-3 text-left font-medium text-muted-foreground" />
                {DAYS.map((day, idx) => (
                  <th
                    key={day}
                    className={cn(
                      "py-2 px-2 text-center font-medium",
                      idx === today ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {day}
                    {idx === today && (
                      <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
                    )}
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
                    const isToday = dayIdx === today

                    return (
                      <td key={dayIdx} className="p-1">
                        <div
                          className={cn(
                            "flex min-h-[4rem] flex-col items-center justify-center rounded-lg border p-2 transition-colors",
                            hasShift
                              ? "border-primary/30 bg-primary/10"
                              : "border-dashed border-border",
                            isToday && !hasShift && "border-primary/20 bg-primary/5",
                          )}
                        >
                          {cellAssignments.map((a) => {
                            const template = shiftTemplates.find((t) => t.id === a.shift_id)
                            const hours = getShiftHours(a.start, a.end)
                            return (
                              <div key={a.shift_id} className="text-center">
                                <p className="text-xs font-medium text-primary">
                                  {template?.name ?? "Shift"}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatTime12(a.start)} – {formatTime12(a.end)}
                                </p>
                                <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0">
                                  {hours}h
                                </Badge>
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

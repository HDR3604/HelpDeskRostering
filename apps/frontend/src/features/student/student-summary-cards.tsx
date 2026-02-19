import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Clock, CalendarCheck, CalendarClock, CircleDot, TrendingUp, Minus } from "lucide-react"
import { MOCK_HOURS_WORKED, MOCK_MISSED_SHIFTS } from "@/lib/mock-data"
import type { Student } from "@/types/student"
import type { Assignment } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"
import type { TimeLog } from "@/types/time-log"

interface StudentSummaryCardsProps {
  student: Student
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
  timeLogs: TimeLog[]
}

interface StatCard {
  title: string
  value: string
  icon: React.ElementType
  trend?: { value: string; direction: "up" | "neutral" }
  iconClassName: string
}

const DAY_NAMES_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function getNextAssignment(assignments: Assignment[]): Assignment | null {
  if (assignments.length === 0) return null

  const now = new Date()
  const jsDay = now.getDay()
  const today = jsDay === 0 ? 6 : jsDay - 1
  const currentHour = now.getHours()

  const sorted = [...assignments].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return a.start.localeCompare(b.start)
  })

  for (const a of sorted) {
    const endHour = parseInt(a.end.split(":")[0], 10)
    if (a.day_of_week > today || (a.day_of_week === today && endHour > currentHour)) {
      return a
    }
  }

  return sorted[0]
}

function formatTimeShort(t: string) {
  const hour = parseInt(t.split(":")[0], 10)
  return hour <= 12 ? `${hour} AM` : `${hour - 12} PM`
}

function getScheduledHours(assignments: Assignment[]): number {
  return assignments.reduce((sum, a) => {
    const start = parseInt(a.start.split(":")[0], 10)
    const end = parseInt(a.end.split(":")[0], 10)
    return sum + (end - start)
  }, 0)
}

function formatDuration(ms: number): string {
  const totalMin = Math.floor(ms / 60_000)
  const hrs = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  if (hrs > 0) return `${hrs}h ${mins}m`
  return `${mins}m`
}

export function StudentSummaryCards({ student, assignments, shiftTemplates, timeLogs }: StudentSummaryCardsProps) {
  const fullName = `${student.first_name} ${student.last_name}`
  const hoursData = MOCK_HOURS_WORKED.find((h) => h.name === fullName)
  const shiftsData = MOCK_MISSED_SHIFTS.find((s) => s.name === fullName)
  const scheduledHours = getScheduledHours(assignments)
  const next = getNextAssignment(assignments)
  const template = next ? shiftTemplates.find((t) => t.id === next.shift_id) : null

  const hoursWorked = hoursData?.hours ?? 0
  const totalShifts = shiftsData?.total ?? 0
  const missedShifts = shiftsData?.missed ?? 0
  const completedShifts = totalShifts - missedShifts
  const attendanceRate = totalShifts > 0 ? Math.round((completedShifts / totalShifts) * 100) : 0
  const hoursPct = scheduledHours > 0 ? Math.round((hoursWorked / scheduledHours) * 100) : 0

  const hasData = assignments.length > 0

  // Clock status: find the most recent time_log for this student
  const myLogs = timeLogs
    .filter((l) => l.student_id === student.student_id)
    .sort((a, b) => new Date(b.entry_at).getTime() - new Date(a.entry_at).getTime())
  const latestLog = myLogs[0] ?? null
  const isOnClock = !!latestLog && latestLog.exit_at === null

  let clockTrend: string
  if (isOnClock) {
    const elapsed = Date.now() - new Date(latestLog.entry_at).getTime()
    clockTrend = `Clocked in ${formatDuration(elapsed)} ago`
  } else if (latestLog?.exit_at) {
    const since = Date.now() - new Date(latestLog.exit_at).getTime()
    clockTrend = `Last clocked out ${formatDuration(since)} ago`
  } else if (next) {
    clockTrend = `Next: ${DAY_NAMES_SHORT[next.day_of_week]} ${formatTimeShort(next.start)}`
  } else {
    clockTrend = "No shifts scheduled"
  }

  const cards: StatCard[] = [
    {
      title: "Hours This Week",
      value: hasData ? `${hoursWorked} / ${scheduledHours}` : "—",
      icon: Clock,
      iconClassName: "bg-blue-500/10 text-blue-500",
      trend: hasData ? { value: `${hoursPct}% of scheduled hours`, direction: "up" } : undefined,
    },
    {
      title: "Shifts Completed",
      value: hasData ? `${completedShifts} / ${totalShifts}` : "—",
      icon: CalendarCheck,
      iconClassName: "bg-emerald-500/10 text-emerald-500",
      trend: hasData ? { value: `${attendanceRate}% attendance`, direction: "up" } : undefined,
    },
    {
      title: "Next Shift",
      value: next ? `${DAY_NAMES_SHORT[next.day_of_week]} ${formatTimeShort(next.start)}` : "—",
      icon: CalendarClock,
      iconClassName: "bg-violet-500/10 text-violet-500",
      trend: template ? { value: template.name, direction: "neutral" } : undefined,
    },
    {
      title: "Clock Status",
      value: isOnClock ? "On Clock" : "Off Clock",
      icon: CircleDot,
      iconClassName: isOnClock ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground",
      trend: { value: clockTrend, direction: isOnClock ? "up" : "neutral" },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.iconClassName)}>
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight sm:text-3xl">{card.value}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {card.trend && (
                <>
                  {card.trend.direction === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                  {card.trend.direction === "neutral" && <Minus className="h-3 w-3 text-amber-500" />}
                  <span>{card.trend.value}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

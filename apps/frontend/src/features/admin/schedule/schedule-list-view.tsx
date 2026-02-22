import { lazy, Suspense, useMemo, Fragment } from "react"
import { CalendarDays, LoaderCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { WEEKDAYS_SHORT, getTodayWeekdayIndex } from "@/lib/constants"
import { formatHour } from "@/lib/format"
import { STUDENT_COLORS } from "./types"

const ScheduleTables = lazy(() =>
  import("./components/schedule-tables").then((m) => ({ default: m.ScheduleTables })),
)
import { getScheduleColumns } from "./columns/schedule-columns"
import { ActiveScheduleCard } from "./components/active-schedule-card"
import { HoursWorkedChart } from "./charts/hours-worked-chart"
import { AttendanceChart } from "./charts/attendance-chart"
import { HoursTrendChart } from "./charts/hours-trend-chart"
import type { ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

function getScheduleStats(schedule: ScheduleResponse | null) {
  if (!schedule) {
    return { totalStudents: 0, totalAssignments: 0, hoursPerDay: [0, 0, 0, 0, 0], avgHoursPerStudent: 0 }
  }
  const studentSet = new Set(schedule.assignments.map((a) => a.assistant_id))
  const totalStudents = studentSet.size
  const totalAssignments = schedule.assignments.length
  const hoursPerDay = [0, 0, 0, 0, 0]
  for (const a of schedule.assignments) {
    if (a.day_of_week >= 0 && a.day_of_week < 5) hoursPerDay[a.day_of_week]++
  }
  const avgHoursPerStudent = totalStudents > 0 ? totalAssignments / totalStudents : 0
  return { totalStudents, totalAssignments, hoursPerDay, avgHoursPerStudent }
}

interface ScheduleListViewProps {
  schedules: ScheduleResponse[]
  shiftTemplates: ShiftTemplate[]
  studentNames: Record<string, string>
  hoursWorked: { name: string; hours: number; fill: string }[]
  missedShifts: { name: string; missed: number; total: number; fill: string }[]
  hoursTrend: { week: string; hours: number }[]
  onCreateNew: () => void
  creatingSchedule?: boolean
  onOpenSchedule: (scheduleId: string) => void
  onRename: (schedule: ScheduleResponse) => void
  onSetActive: (schedule: ScheduleResponse) => void
  onDownload: (schedule: ScheduleResponse) => void
  onArchive: (schedule: ScheduleResponse) => void
  onUnarchive: (schedule: ScheduleResponse) => void
  onDeactivate: (schedule: ScheduleResponse) => void
  onNotify: (schedule: ScheduleResponse) => void
}

export function ScheduleListView({
  schedules,
  shiftTemplates,
  studentNames,
  hoursWorked,
  missedShifts,
  hoursTrend,
  onCreateNew,
  creatingSchedule,
  onOpenSchedule,
  onRename,
  onSetActive,
  onDownload,
  onArchive,
  onUnarchive,
  onDeactivate,
  onNotify,
}: ScheduleListViewProps) {
  const activeSchedule = schedules.find((s) => s.is_active) ?? null
  const pastSchedules = schedules.filter((s) => !s.is_active)
  const stats = getScheduleStats(activeSchedule)

  const scheduleColumns = useMemo(
    () => getScheduleColumns({ onOpen: onOpenSchedule, onRename, onSetActive, onDownload, onArchive, onUnarchive }),
    [onOpenSchedule, onRename, onSetActive, onDownload, onArchive, onUnarchive],
  )

  return (
    <div className="flex flex-col gap-6" style={{ minHeight: "calc(100dvh - 3.5rem - 3rem)" }}>
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Schedule</h1>
          <p className="mt-1 text-muted-foreground">Create and manage weekly schedules.</p>
        </div>
        <Button variant="outline" size="sm" disabled={creatingSchedule} onClick={onCreateNew}>
          {creatingSchedule
            ? <LoaderCircle className="mr-1 h-3.5 w-3.5 animate-spin" />
            : <Plus className="mr-1 h-3.5 w-3.5" />}
          Create Schedule
        </Button>
      </div>

      {/* Active schedule */}
      <div className="space-y-3">
        {activeSchedule ? (
          <>
            <ActiveScheduleCard
              schedule={activeSchedule}
              stats={stats}
              onOpen={onOpenSchedule}
              onRename={onRename}
              onDownload={onDownload}
              onArchive={onArchive}
              onDeactivate={onDeactivate}
              onNotify={onNotify}
            />
            <ScheduleOverview
              schedule={activeSchedule}
              shiftTemplates={shiftTemplates}
              studentNames={studentNames}
            />
          </>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">No active schedule. Create one or activate an existing schedule.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schedules table (lazy — loads DataTable on demand) */}
      {pastSchedules.length > 0 && (
        <Suspense fallback={
          <div className="flex items-center justify-center rounded-lg border py-16">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }>
          <ScheduleTables
            schedules={pastSchedules}
            columns={scheduleColumns}
            onOpenSchedule={onOpenSchedule}
          />
        </Suspense>
      )}

      {/* Analytics */}
      {activeSchedule && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Analytics</h2>
            <p className="text-sm text-muted-foreground">Hours worked and attendance for the current schedule period.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <HoursWorkedChart data={hoursWorked} />
            <AttendanceChart data={missedShifts} />
            <div className="lg:col-span-2">
              <HoursTrendChart data={hoursTrend} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// --- Schedule overview (read-only, follows editor grid design) ---

function ScheduleOverview({
  schedule,
  shiftTemplates,
  studentNames,
}: {
  schedule: ScheduleResponse
  shiftTemplates: ShiftTemplate[]
  studentNames: Record<string, string>
}) {
  const today = getTodayWeekdayIndex()

  const uniqueStudentIds = useMemo(
    () => Array.from(new Set(schedule.assignments.map((a) => a.assistant_id))),
    [schedule],
  )

  const studentColorIndex = useMemo(
    () => Object.fromEntries(uniqueStudentIds.map((id, i) => [id, i % STUDENT_COLORS.length])),
    [uniqueStudentIds],
  )

  // Build shift → students map
  const assignmentsByShift = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const a of schedule.assignments) {
      if (!map[a.shift_id]) map[a.shift_id] = []
      map[a.shift_id].push(a.assistant_id)
    }
    return map
  }, [schedule])

  // Deduplicate time slots, sorted
  const timeSlots = useMemo(() => {
    const slots = new Map<string, { start: string; end: string }>()
    for (const s of shiftTemplates) {
      const key = `${s.start_time}-${s.end_time}`
      if (!slots.has(key)) slots.set(key, { start: s.start_time, end: s.end_time })
    }
    return Array.from(slots.values()).sort((a, b) => a.start.localeCompare(b.start))
  }, [shiftTemplates])

  // Quick shift lookup: "startTime-endTime-dayOfWeek" → ShiftTemplate
  const shiftLookup = useMemo(() => {
    const map = new Map<string, ShiftTemplate>()
    for (const s of shiftTemplates) map.set(`${s.start_time}-${s.end_time}-${s.day_of_week}`, s)
    return map
  }, [shiftTemplates])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Overview</CardTitle>
        <CardDescription>
          {schedule.title} — {uniqueStudentIds.length} students, {schedule.assignments.length} assignments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[36rem]"
            style={{
              gridTemplateColumns: "3.5rem repeat(5, 1fr)",
              gridTemplateRows: `auto repeat(${timeSlots.length}, auto)`,
            }}
          >
            {/* Day header row */}
            <div className="border-b border-border" />
            {WEEKDAYS_SHORT.map((day, idx) => (
              <div
                key={day}
                className={cn(
                  "flex items-center justify-center border-b border-border py-2",
                  idx > 0 && "border-l border-border",
                  idx === today && "bg-foreground/[0.03]",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    idx === today ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {day}
                </span>
              </div>
            ))}

            {/* Time slot rows */}
            {timeSlots.map((slot) => (
              <Fragment key={slot.start}>
                {/* Time gutter */}
                <div className="flex items-start justify-end border-b border-r border-border pr-2 pt-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums leading-none">
                    {formatHour(slot.start)}
                  </span>
                </div>

                {/* Day cells */}
                {WEEKDAYS_SHORT.map((_, dayIdx) => {
                  const shift = shiftLookup.get(`${slot.start}-${slot.end}-${dayIdx}`)
                  const students = shift ? (assignmentsByShift[shift.id] ?? []) : []

                  return (
                    <div
                      key={`${slot.start}-${dayIdx}`}
                      className={cn(
                        "min-h-10 border-b border-border p-1.5 sm:p-2",
                        dayIdx > 0 && "border-l border-border",
                        dayIdx === today && "bg-foreground/[0.03]",
                      )}
                    >
                      {students.length > 0 ? (
                        <div className="flex flex-col gap-0.5 sm:gap-1">
                          {students.map((sid) => {
                            const color = STUDENT_COLORS[studentColorIndex[sid] ?? 0]
                            const name = studentNames[sid] || sid.slice(0, 6)
                            const firstName = name.split(" ")[0]
                            return (
                              <TooltipProvider key={sid} delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div
                                      className={cn("flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-2 py-1 sm:py-1.5 text-[10px] sm:text-xs leading-none", color.bg)}
                                    >
                                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color.dot)} />
                                      <span className="min-w-0 truncate font-medium text-foreground">{firstName}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    {name}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <span className="text-[9px] text-muted-foreground/30">—</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 border-t pt-3">
          {uniqueStudentIds.map((id) => {
            const color = STUDENT_COLORS[studentColorIndex[id] ?? 0]
            const name = studentNames[id] || id.slice(0, 8)
            return (
              <div key={id} className="flex items-center gap-1.5 text-xs">
                <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
                <span className="truncate max-w-[7rem]">{name}</span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

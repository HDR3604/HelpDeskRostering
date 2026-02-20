import { lazy, Suspense, useState, useMemo, Fragment } from "react"
import {
  CalendarDays,
  LoaderCircle,
  Plus,
  MoreHorizontal,
  Pencil,
  Download,
  Type,
  Archive,
  ExternalLink,
  ZapOff,
  Bell,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, Rectangle, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const ScheduleTables = lazy(() =>
  import("./schedule-tables").then((m) => ({ default: m.ScheduleTables })),
)
import { getScheduleColumns } from "./columns/schedule-columns"
import type { ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

function formatDateShort(date: string): string {
  const d = new Date(date + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getScheduleStats(schedule: ScheduleResponse | null) {
  if (!schedule) {
    return { totalStudents: 0, totalAssignments: 0, hoursPerDay: [0, 0, 0, 0, 0], avgHoursPerStudent: 0, peakDay: 0 }
  }
  const studentSet = new Set(schedule.assignments.map((a) => a.assistant_id))
  const totalStudents = studentSet.size
  const totalAssignments = schedule.assignments.length
  const hoursPerDay = [0, 0, 0, 0, 0]
  for (const a of schedule.assignments) {
    if (a.day_of_week >= 0 && a.day_of_week < 5) hoursPerDay[a.day_of_week]++
  }
  const peakDay = hoursPerDay.indexOf(Math.max(...hoursPerDay))
  const avgHoursPerStudent = totalStudents > 0 ? totalAssignments / totalStudents : 0
  return { totalStudents, totalAssignments, hoursPerDay, avgHoursPerStudent, peakDay }
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

// --- Active schedule card (compact header) ---

function ActiveScheduleCard({
  schedule,
  stats,
  onOpen,
  onRename,
  onDownload,
  onArchive,
  onDeactivate,
  onNotify,
}: {
  schedule: ScheduleResponse
  stats: ReturnType<typeof getScheduleStats>
  onOpen: (id: string) => void
  onRename: (s: ScheduleResponse) => void
  onDownload: (s: ScheduleResponse) => void
  onArchive: (s: ScheduleResponse) => void
  onDeactivate: (s: ScheduleResponse) => void
  onNotify: (s: ScheduleResponse) => void
}) {
  const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const peakDayLabel = DAYS[stats.peakDay] ?? "—"

  return (
    <Card
      className="group cursor-pointer overflow-hidden border-l-2 border-l-emerald-500 transition-colors hover:bg-muted/50"
      onClick={() => onOpen(schedule.schedule_id)}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
            <CalendarDays className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{schedule.title}</span>
              <Badge className="shrink-0 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 text-[11px]">Active</Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {formatDateShort(schedule.effective_from)}
                {schedule.effective_to ? ` — ${formatDateShort(schedule.effective_to)}` : " onwards"}
              </span>
              <span className="text-border">·</span>
              <span><span className="tabular-nums">{stats.totalStudents}</span> students</span>
              <span className="text-border">·</span>
              <span><span className="tabular-nums">{stats.totalAssignments}</span> shifts</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(schedule.schedule_id) }}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onRename(schedule) }}>
                <Type className="mr-2 h-3.5 w-3.5" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDownload(schedule) }}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onNotify(schedule) }}>
                <Bell className="mr-2 h-3.5 w-3.5" />
                Notify
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDeactivate(schedule) }}>
                <ZapOff className="mr-2 h-3.5 w-3.5" />
                Deactivate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(schedule) }}>
                <Archive className="mr-2 h-3.5 w-3.5" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
      </div>
    </Card>
  )
}

// --- Schedule overview (read-only, follows editor grid design) ---

const OVERVIEW_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-500/20", dot: "bg-blue-500" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/20", dot: "bg-emerald-500" },
  { bg: "bg-violet-100 dark:bg-violet-500/20", dot: "bg-violet-500" },
  { bg: "bg-rose-100 dark:bg-rose-500/20", dot: "bg-rose-500" },
  { bg: "bg-amber-100 dark:bg-amber-500/20", dot: "bg-amber-500" },
  { bg: "bg-teal-100 dark:bg-teal-500/20", dot: "bg-teal-500" },
  { bg: "bg-pink-100 dark:bg-pink-500/20", dot: "bg-pink-500" },
  { bg: "bg-sky-100 dark:bg-sky-500/20", dot: "bg-sky-500" },
]

const OVERVIEW_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function formatHour(t: string) {
  const hour = parseInt(t.split(":")[0], 10)
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

function ScheduleOverview({
  schedule,
  shiftTemplates,
  studentNames,
}: {
  schedule: ScheduleResponse
  shiftTemplates: ShiftTemplate[]
  studentNames: Record<string, string>
}) {
  const jsDay = new Date().getDay()
  const today = jsDay === 0 ? 6 : jsDay - 1

  const uniqueStudentIds = useMemo(
    () => Array.from(new Set(schedule.assignments.map((a) => a.assistant_id))),
    [schedule],
  )

  const studentColorIndex = useMemo(
    () => Object.fromEntries(uniqueStudentIds.map((id, i) => [id, i % OVERVIEW_COLORS.length])),
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
            {OVERVIEW_DAYS.map((day, idx) => (
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
                {OVERVIEW_DAYS.map((_, dayIdx) => {
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
                            const color = OVERVIEW_COLORS[studentColorIndex[sid] ?? 0]
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
                                  <TooltipContent side="top" sideOffset={4} showArrow={false} className="bg-background text-foreground border border-border/50 rounded-lg shadow-xl px-2.5 py-1.5 text-xs">
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
            const color = OVERVIEW_COLORS[studentColorIndex[id] ?? 0]
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

// --- Time log charts ---

const hoursWorkedConfig = {
  hours: { label: "Hours" },
} satisfies ChartConfig

function HoursWorkedChart({ data }: { data: { name: string; hours: number; fill: string }[] }) {
  const sorted = useMemo(() => [...data].sort((a, b) => b.hours - a.hours), [data])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hours Worked</CardTitle>
        <CardDescription>Week of Feb 17 – 21</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={hoursWorkedConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={sorted}
            layout="vertical"
            margin={{ left: 0 }}
            barSize={20}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={110}
            />
            <XAxis dataKey="hours" type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Bar dataKey="hours" radius={4}>
              <LabelList dataKey="hours" position="right" className="fill-foreground text-xs" />
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

const attendanceConfig = {
  attended: { label: "Attended", color: "var(--color-primary)" },
  missed: { label: "Missed", color: "var(--color-chart-1)" },
} satisfies ChartConfig

function AttendanceChart({ data }: { data: { name: string; missed: number; total: number; fill: string }[] }) {
  const stacked = useMemo(
    () => data
      .map(({ fill: _, ...d }) => ({ ...d, attended: d.total - d.missed }))
      .sort((a, b) => b.total - a.total),
    [data],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shift Attendance</CardTitle>
        <CardDescription>Week of Feb 17 – 21</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={attendanceConfig} className="h-[300px] w-full">
          <BarChart
            accessibilityLayer
            data={stacked}
            layout="vertical"
            margin={{ left: 0 }}
            barSize={20}
          >
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              width={110}
            />
            <XAxis type="number" hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="attended"
              stackId="shifts"
              fill="var(--color-attended)"
              shape={(props: unknown) => {
                const p = props as Record<string, unknown> & { payload?: { missed?: number } }
                return <Rectangle {...p} radius={(p.payload?.missed ?? 0) > 0 ? [4, 0, 0, 4] : 4} />
              }}
            />
            <Bar
              dataKey="missed"
              stackId="shifts"
              fill="var(--color-missed)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Semester trend chart ---

const hoursTrendConfig = {
  hours: { label: "Total Hours", color: "var(--color-primary)" },
} satisfies ChartConfig

function HoursTrendChart({ data }: { data: { week: string; hours: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Semester Trend</CardTitle>
        <CardDescription>Total hours worked per week this semester</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={hoursTrendConfig} className="h-[300px] w-full">
          <LineChart accessibilityLayer data={data} margin={{ top: 16, right: 16 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="week" tickLine={false} axisLine={false} tickMargin={10} />
            <YAxis tickLine={false} axisLine={false} tickMargin={10} width={40} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="hours"
              type="monotone"
              stroke="var(--color-hours)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--color-hours)" }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}


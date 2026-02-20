import { useMemo, Fragment } from "react"
import { cn } from "@/lib/utils"
import { WEEKDAYS_SHORT, WEEKDAYS_LETTER, getTodayWeekdayIndex } from "@/lib/constants"
import { formatHour, formatHourShort } from "@/lib/format"
import type { ShiftTemplate } from "@/types/shift-template"
import type { EditorAction } from "../types"
import { isStudentAvailableForShift } from "../types"
import { ShiftCell } from "./shift-cell"

interface ScheduleGridProps {
  shiftTemplates: ShiftTemplate[]
  assignmentsByShift: Record<string, string[]>
  studentNames: Record<string, string>
  studentColorIndex: Record<string, number>
  dispatch: React.Dispatch<EditorAction>
  highlightedStudentId: string | null
  studentAvailabilityMap: Record<string, Record<number, number[]>>
}

export function ScheduleGrid({ shiftTemplates, assignmentsByShift, studentNames, studentColorIndex, dispatch, highlightedStudentId, studentAvailabilityMap }: ScheduleGridProps) {
  const today = getTodayWeekdayIndex()

  const timeSlots = useMemo(() => {
    const slots = new Map<string, { start: string; end: string }>()
    for (const s of shiftTemplates) {
      const key = `${s.start_time}-${s.end_time}`
      if (!slots.has(key)) {
        slots.set(key, { start: s.start_time, end: s.end_time })
      }
    }
    return Array.from(slots.values()).sort((a, b) => a.start.localeCompare(b.start))
  }, [shiftTemplates])

  const shiftLookup = useMemo(() => {
    const map = new Map<string, ShiftTemplate>()
    for (const s of shiftTemplates) {
      map.set(`${s.start_time}-${s.end_time}-${s.day_of_week}`, s)
    }
    return map
  }, [shiftTemplates])

  return (
    <div
      className="grid grid-cols-[2.5rem_repeat(5,minmax(4.5rem,1fr))] lg:grid-cols-[4.5rem_repeat(5,1fr)] min-h-full min-w-[25rem] select-none"
      style={{ gridTemplateRows: `auto repeat(${timeSlots.length}, auto)` }}
    >
      {/* Day header row */}
      <div className="sticky top-0 left-0 z-30 border-b border-border/60 bg-card" />
      {WEEKDAYS_SHORT.map((day, idx) => (
        <div
          key={day}
          className={cn(
            "sticky top-0 z-20 flex items-center justify-center border-b border-border/60 bg-card py-2.5 lg:py-3.5",
            idx > 0 && "border-l border-border/60",
            idx === today && "bg-foreground/[0.03]",
          )}
        >
          <span
            className={cn(
              "text-xs font-semibold tracking-wide",
              idx === today
                ? "text-foreground"
                : "text-muted-foreground",
            )}
          >
            <span className="lg:hidden">{WEEKDAYS_LETTER[idx]}</span>
            <span className="hidden lg:inline">{day}</span>
          </span>
        </div>
      ))}

      {/* Time slot rows */}
      {timeSlots.map((slot) => (
        <Fragment key={slot.start}>
          {/* Time gutter */}
          <div className="sticky left-0 z-10 flex items-start justify-end border-b border-r border-border/60 bg-card pr-1.5 lg:pr-3 pt-2">
            <span className="text-[10px] lg:text-[11px] font-medium text-muted-foreground tabular-nums leading-none">
              <span className="lg:hidden">{formatHourShort(slot.start)}</span>
              <span className="hidden lg:inline">{formatHour(slot.start)}</span>
            </span>
          </div>

          {/* Day cells */}
          {WEEKDAYS_SHORT.map((_, dayIdx) => {
            const shift = shiftLookup.get(`${slot.start}-${slot.end}-${dayIdx}`)
            const highlightedAvailability = highlightedStudentId && shift
              ? (isStudentAvailableForShift(studentAvailabilityMap[highlightedStudentId], shift) ? "available" as const : "unavailable" as const)
              : null
            return (
              <div
                key={`c-${slot.start}-${dayIdx}`}
                className={cn(
                  "border-b border-border/60 p-0.5 lg:p-1 transition-colors duration-200",
                  dayIdx > 0 && "border-l border-border/60",
                  dayIdx === today && "bg-foreground/[0.03]",
                )}
              >
                {shift && (
                  <ShiftCell
                    shift={shift}
                    assignedStudentIds={assignmentsByShift[shift.id] ?? []}
                    studentNames={studentNames}
                    studentColorIndex={studentColorIndex}
                    dispatch={dispatch}
                    availability={highlightedAvailability}
                  />
                )}
              </div>
            )
          })}
        </Fragment>
      ))}
    </div>
  )
}

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCenter } from "@dnd-kit/core"
import type { DragStartEvent, DragEndEvent } from "@dnd-kit/core"
import type { ScheduleResponse } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"
import type { Student } from "@/types/student"
import { buildStudentNameMap } from "@/lib/mock-data"
import { parseDragId } from "./types"
import { useScheduleEditor } from "./use-schedule-editor"
import { ScheduleEditorToolbar } from "./schedule-editor-toolbar"
import { ScheduleGrid } from "./schedule-grid"
import { StudentPool } from "./student-pool"
import { StudentChipOverlay } from "./student-chip"

interface ScheduleEditorProps {
  schedule: ScheduleResponse
  shiftTemplates: ShiftTemplate[]
  students: Student[]
  onSave: (updated: ScheduleResponse) => void
  onBack: () => void
}

export function ScheduleEditor({ schedule, shiftTemplates, students, onSave, onBack }: ScheduleEditorProps) {
  const { state, dispatch, assignedStudentIds, studentColorIndex, handleSave } =
    useScheduleEditor(schedule, shiftTemplates, students, onSave)

  const studentNames = useMemo(() => buildStudentNameMap(students), [students])

  // Save status feedback
  const [saveStatus, setSaveStatus] = useState<"success" | "error" | null>(null)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  const wrappedSave = useCallback(async () => {
    try {
      await handleSave()
      setSaveStatus("success")
    } catch {
      setSaveStatus("error")
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaveStatus(null), 2000)
  }, [handleSave])

  // Cmd+S / Ctrl+S keyboard shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault()
        if (state.isDirty && !state.isSaving) wrappedSave()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [state.isDirty, state.isSaving, wrappedSave])

  const dateRange = schedule.effective_from + (schedule.effective_to ? ` — ${schedule.effective_to}` : " onwards")

  const studentHours = useMemo(() => {
    const hours: Record<string, number> = {}
    const shiftMap = new Map(shiftTemplates.map((s) => [s.id, s]))
    for (const [shiftId, studentIds] of Object.entries(state.assignmentsByShift)) {
      const shift = shiftMap.get(shiftId)
      if (!shift) continue
      const shiftStart = parseInt(shift.start_time.split(":")[0], 10)
      const shiftEnd = parseInt(shift.end_time.split(":")[0], 10)
      const duration = shiftEnd - shiftStart
      for (const sid of studentIds) {
        hours[sid] = (hours[sid] || 0) + duration
      }
    }
    return hours
  }, [state.assignmentsByShift, shiftTemplates])

  // Toolbar stats
  const toolbarStats = useMemo(() => {
    const assignedIds = new Set<string>()
    let totalAssignments = 0
    for (const ids of Object.values(state.assignmentsByShift)) {
      totalAssignments += ids.length
      for (const id of ids) assignedIds.add(id)
    }
    const totalHours = Object.values(studentHours).reduce((sum, h) => sum + h, 0)
    return { totalAssignments, totalStudents: assignedIds.size, totalHours }
  }, [state.assignmentsByShift, studentHours])

  // DnD
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeDragData = useMemo(() => {
    if (!activeId) return null
    const parsed = parseDragId(activeId)
    if (!parsed) return null
    return {
      studentId: parsed.studentId,
      name: studentNames[parsed.studentId] || parsed.studentId,
      colorIndex: studentColorIndex[parsed.studentId] ?? 0,
    }
  }, [activeId, studentNames, studentColorIndex])

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id))
  }, [])

  const dropSucceededRef = useRef(false)

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      dropSucceededRef.current = false
      const { active, over } = event
      if (!over) { setActiveId(null); return }

      const source = parseDragId(String(active.id))
      if (!source) { setActiveId(null); return }

      const destId = String(over.id)

      if (destId === "pool") {
        if (source.context === "cell") {
          dispatch({ type: "UNASSIGN_STUDENT", shiftId: source.shiftId, studentId: source.studentId })
        }
        setActiveId(null)
        return
      }

      if (destId.startsWith("shift::")) {
        const destShiftId = destId.replace("shift::", "")
        if (source.context === "pool") {
          dispatch({ type: "ASSIGN_STUDENT", shiftId: destShiftId, studentId: source.studentId })
          dropSucceededRef.current = true
        } else if (source.context === "cell" && source.shiftId !== destShiftId) {
          dispatch({ type: "MOVE_STUDENT", fromShiftId: source.shiftId, toShiftId: destShiftId, studentId: source.studentId })
          dropSucceededRef.current = true
        }
      }

      setActiveId(null)
    },
    [dispatch],
  )

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      <ScheduleEditorToolbar
        scheduleTitle={schedule.title}
        dateRange={dateRange}
        onBack={onBack}
        onSave={wrappedSave}
        hasChanges={state.isDirty}
        isSaving={state.isSaving}
        saveStatus={saveStatus}
        totalAssignments={toolbarStats.totalAssignments}
        totalStudents={toolbarStats.totalStudents}
        totalHours={toolbarStats.totalHours}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 gap-3">
          <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden rounded-xl border bg-card">
            <ScheduleGrid
              shiftTemplates={shiftTemplates}
              assignmentsByShift={state.assignmentsByShift}
              studentNames={studentNames}
              studentColorIndex={studentColorIndex}
              dispatch={dispatch}
            />
          </div>

          <StudentPool
            students={students}
            assignedStudentIds={assignedStudentIds}
            studentColorIndex={studentColorIndex}
            studentHours={studentHours}
            dispatch={dispatch}
          />
        </div>

        <DragOverlay dropAnimation={dropSucceededRef.current ? null : undefined}>
          {activeDragData && (
            <StudentChipOverlay name={activeDragData.name} colorIndex={activeDragData.colorIndex} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

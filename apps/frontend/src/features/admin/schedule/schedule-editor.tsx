import { useState, useMemo, useCallback } from "react"
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
  const { state, dispatch, unassignedStudents, studentColorIndex, handleGenerate, handleSave } =
    useScheduleEditor(schedule, shiftTemplates, students, onSave)

  const studentNames = useMemo(() => buildStudentNameMap(students), [students])

  const dateRange = schedule.effective_from + (schedule.effective_to ? ` — ${schedule.effective_to}` : " onwards")

  // Count total assignments
  const assignmentCount = useMemo(() => {
    let count = 0
    for (const ids of Object.values(state.assignmentsByShift)) {
      count += ids.length
    }
    return count
  }, [state.assignmentsByShift])

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

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null)
      const { active, over } = event
      if (!over) return

      const source = parseDragId(String(active.id))
      if (!source) return

      const destId = String(over.id)

      if (destId === "pool") {
        if (source.context === "cell") {
          dispatch({ type: "UNASSIGN_STUDENT", shiftId: source.shiftId, studentId: source.studentId })
        }
        return
      }

      if (destId.startsWith("shift::")) {
        const destShiftId = destId.replace("shift::", "")
        if (source.context === "pool") {
          dispatch({ type: "ASSIGN_STUDENT", shiftId: destShiftId, studentId: source.studentId })
        } else if (source.context === "cell" && source.shiftId !== destShiftId) {
          dispatch({ type: "MOVE_STUDENT", fromShiftId: source.shiftId, toShiftId: destShiftId, studentId: source.studentId })
        }
      }
    },
    [dispatch],
  )

  return (
    <div className="flex flex-col gap-4" style={{ height: "calc(100dvh - 3.5rem - 3rem)" }}>
      <ScheduleEditorToolbar
        scheduleTitle={schedule.title}
        dateRange={dateRange}
        isActive={schedule.is_active}
        studentCount={students.length}
        assignmentCount={assignmentCount}
        onBack={onBack}
        onSave={handleSave}
        onGenerate={handleGenerate}
        hasChanges={state.isDirty}
        isGenerating={state.isGenerating}
        isSaving={state.isSaving}
      />

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex min-h-0 flex-1 gap-4">
          {/* Calendar grid — inside a Card */}
          <div className="flex-1 min-w-0 overflow-auto rounded-xl border bg-card shadow-sm">
            <ScheduleGrid
              shiftTemplates={shiftTemplates}
              assignmentsByShift={state.assignmentsByShift}
              studentNames={studentNames}
              studentColorIndex={studentColorIndex}
              dispatch={dispatch}
            />
          </div>

          {/* Student pool — Card sidebar */}
          <StudentPool
            unassignedStudents={unassignedStudents}
            allStudents={students}
            studentColorIndex={studentColorIndex}
            studentHours={studentHours}
            dispatch={dispatch}
          />
        </div>

        <DragOverlay>
          {activeDragData && (
            <StudentChipOverlay name={activeDragData.name} colorIndex={activeDragData.colorIndex} />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

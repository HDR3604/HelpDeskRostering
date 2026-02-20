import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import type { ShiftTemplate } from "@/types/shift-template"
import type { EditorAction } from "./types"
import { StudentChip } from "./student-chip"

interface ShiftCellProps {
  shift: ShiftTemplate
  assignedStudentIds: string[]
  studentNames: Record<string, string>
  studentColorIndex: Record<string, number>
  dispatch: React.Dispatch<EditorAction>
}

export function ShiftCell({ shift, assignedStudentIds, studentNames, studentColorIndex, dispatch }: ShiftCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: `shift::${shift.id}` })

  const count = assignedStudentIds.length
  const isFull = shift.max_staff !== null && count >= shift.max_staff

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full rounded-md transition-colors",
        isOver && !isFull && "bg-primary/8 ring-1 ring-inset ring-primary/20",
        isOver && isFull && "bg-destructive/8 ring-1 ring-inset ring-destructive/20",
      )}
    >
      <div className="flex flex-col gap-1">
        {assignedStudentIds.map((sid) => (
          <StudentChip
            key={sid}
            studentId={sid}
            name={studentNames[sid] || sid}
            colorIndex={studentColorIndex[sid] ?? 0}
            context="cell"
            shiftId={shift.id}
            dispatch={dispatch}
          />
        ))}
      </div>
    </div>
  )
}

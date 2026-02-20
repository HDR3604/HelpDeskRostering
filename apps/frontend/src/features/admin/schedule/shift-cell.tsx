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
  const max = shift.max_staff
  const isFull = max !== null && count >= max

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full rounded-md transition-colors",
        isOver && !isFull && "bg-primary/[0.06]",
        isOver && isFull && "bg-destructive/[0.06]",
      )}
    >
      {count > 0 && (
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
      )}
    </div>
  )
}

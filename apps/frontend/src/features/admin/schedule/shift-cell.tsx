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
  const min = shift.min_staff
  const max = shift.max_staff
  const isFull = max !== null && count >= max
  const isUnder = count < min

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-md transition-colors",
        isOver && !isFull && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
        isOver && isFull && "bg-destructive/[0.06] ring-1 ring-inset ring-destructive/20",
      )}
    >
      {/* Staffing indicator */}
      <div className="flex items-center justify-end px-0.5 sm:px-1 pt-0.5 pb-0.5">
        <span
          className={cn(
            "text-[8px] sm:text-[9px] tabular-nums font-medium",
            count === 0 && "text-muted-foreground/40",
            count > 0 && isUnder && "text-amber-500",
            count > 0 && !isUnder && "text-emerald-500",
            isFull && "text-muted-foreground",
          )}
        >
          {count}/{max ?? min}
        </span>
      </div>

      {count > 0 ? (
        <div className="flex flex-col gap-0.5 sm:gap-1 px-0.5 pb-0.5 sm:pb-1">
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
      ) : (
        <div className="flex items-center justify-center pb-1">
          <span className="text-[9px] text-muted-foreground/30">—</span>
        </div>
      )}
    </div>
  )
}

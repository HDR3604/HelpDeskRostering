import { useDroppable } from "@dnd-kit/core"
import { cn } from "@/lib/utils"
import type { ShiftTemplate } from "@/types/shift-template"
import type { EditorAction } from "../types"
import { StudentChip } from "./student-chip"

interface ShiftCellProps {
  shift: ShiftTemplate
  assignedStudentIds: string[]
  studentNames: Record<string, string>
  studentColorIndex: Record<string, number>
  dispatch: React.Dispatch<EditorAction>
  availability: "available" | "unavailable" | null
}

export function ShiftCell({ shift, assignedStudentIds, studentNames, studentColorIndex, dispatch, availability }: ShiftCellProps) {
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
        "rounded-md transition-all duration-200 ease-in-out min-h-[3rem] lg:min-h-[3rem]",
        isOver && !isFull && "bg-primary/[0.06] ring-1 ring-inset ring-primary/20",
        isOver && isFull && "bg-destructive/[0.06] ring-1 ring-inset ring-destructive/20",
        !isOver && availability === "available" && "bg-emerald-500/[0.06] ring-1 ring-inset ring-emerald-500/20",
        !isOver && availability === "unavailable" && "bg-destructive/[0.04] opacity-40",
      )}
    >
      {count > 0 ? (
        <div className="flex flex-col gap-0 lg:gap-0.5 px-0.5 lg:px-1 py-0.5 lg:py-1">
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
          <span
            className={cn(
              "self-end text-[8px] lg:text-[9px] tabular-nums font-medium px-0.5 lg:px-1",
              isUnder && "text-amber-500",
              !isUnder && !isFull && "text-muted-foreground/40",
              isFull && "text-muted-foreground/40",
            )}
          >
            {count}/{max ?? min}
          </span>
        </div>
      ) : (
        <div className="flex items-center justify-center h-full py-3">
          <span className="text-[9px] text-muted-foreground/20 tabular-nums">
            0/{max ?? min}
          </span>
        </div>
      )}
    </div>
  )
}

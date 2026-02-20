import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildDragId, STUDENT_COLORS } from "./types"
import type { EditorAction } from "./types"

interface StudentChipProps {
  studentId: string
  name: string
  colorIndex: number
  context: "pool" | "cell"
  shiftId?: string
  hours?: number
  maxHours?: number | null
  assigned?: boolean
  dispatch?: React.Dispatch<EditorAction>
}

export function StudentChip({ studentId, name, colorIndex, context, shiftId, hours, maxHours, dispatch }: StudentChipProps) {
  const dragId = buildDragId(
    context === "pool"
      ? { context: "pool", studentId }
      : { context: "cell", shiftId: shiftId!, studentId },
  )

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const color = STUDENT_COLORS[colorIndex % STUDENT_COLORS.length]
  const firstName = name.split(" ")[0]

  // Grid cell chip
  if (context === "cell") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          "group flex items-center gap-1 sm:gap-1.5 rounded-md px-1 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs leading-none cursor-grab select-none",
          color.bg,
          isDragging && "opacity-30",
        )}
      >
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color.dot)} />
        <span className="min-w-0 truncate font-medium text-foreground">{firstName}</span>
        {dispatch && shiftId && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => dispatch({ type: "UNASSIGN_STUDENT", shiftId, studentId })}
            className="ml-auto shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-2.5 w-2.5 text-muted-foreground" />
          </button>
        )}
      </div>
    )
  }

  // Pool sidebar chip
  const atMax = maxHours != null && (hours ?? 0) >= maxHours

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2.5 py-1.5 cursor-grab select-none transition-colors",
        "hover:bg-accent/50",
        isDragging && "opacity-30",
      )}
    >
      <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
      <span className="min-w-0 flex-1 truncate text-xs text-foreground">{name}</span>
      <span
        className={cn(
          "text-[10px] tabular-nums shrink-0",
          atMax ? "text-red-500" : "text-muted-foreground/70",
        )}
      >
        {hours ?? 0}/{maxHours ?? "∞"}h
      </span>
    </div>
  )
}

/** Render-only clone for DragOverlay */
export function StudentChipOverlay({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = STUDENT_COLORS[colorIndex % STUDENT_COLORS.length]
  const firstName = name.split(" ")[0]

  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs leading-none shadow-lg ring-1 ring-black/5",
      color.bg,
    )}>
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color.dot)} />
      <span className="font-medium text-foreground">{firstName}</span>
    </div>
  )
}

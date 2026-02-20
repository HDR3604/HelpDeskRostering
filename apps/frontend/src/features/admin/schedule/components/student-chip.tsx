import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildDragId, STUDENT_COLORS } from "../types"
import type { EditorAction } from "../types"

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
  onHoverStudent?: (id: string | null) => void
}

export function StudentChip({ studentId, name, colorIndex, context, shiftId, hours, maxHours, dispatch, onHoverStudent }: StudentChipProps) {
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
          "group flex items-center gap-1 lg:gap-1.5 rounded px-1.5 lg:px-2 py-1.5 lg:py-1 text-[11px] lg:text-xs leading-none cursor-grab select-none touch-manipulation",
          "hover:bg-accent/50 transition-colors",
          isDragging && "opacity-30",
        )}
      >
        <span className={cn("h-2 w-2 shrink-0 rounded-full", color.dot)} />
        <span className={cn("min-w-0 truncate font-medium", color.text)}>{firstName}</span>
        {dispatch && shiftId && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => dispatch({ type: "UNASSIGN_STUDENT", shiftId, studentId })}
            className="ml-auto shrink-0 rounded p-1 opacity-100 lg:opacity-0 transition-opacity lg:group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
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
      onMouseEnter={() => onHoverStudent?.(studentId)}
      onMouseLeave={() => onHoverStudent?.(null)}
      className={cn(
        "group flex items-center gap-2 rounded-md px-2.5 py-2 cursor-grab select-none transition-colors touch-manipulation",
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
    <div className="flex items-center gap-1.5 rounded-md bg-card px-2.5 py-1.5 text-xs leading-none shadow-lg ring-1 ring-border">
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", color.dot)} />
      <span className={cn("font-medium", color.text)}>{firstName}</span>
    </div>
  )
}

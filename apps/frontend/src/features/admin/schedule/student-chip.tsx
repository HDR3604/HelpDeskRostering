import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { X, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildDragId, STUDENT_COLORS } from "./types"
import type { EditorAction } from "./types"

interface StudentChipProps {
  studentId: string
  name: string
  colorIndex: number
  context: "pool" | "cell"
  shiftId?: string
  dispatch?: React.Dispatch<EditorAction>
}

export function StudentChip({ studentId, name, colorIndex, context, shiftId, dispatch }: StudentChipProps) {
  const dragId = buildDragId(
    context === "pool"
      ? { context: "pool", studentId }
      : { context: "cell", shiftId: shiftId!, studentId },
  )

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId })

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const color = STUDENT_COLORS[colorIndex % STUDENT_COLORS.length]
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  // Grid cell chip — matches dashboard mini-weekly-schedule card style
  if (context === "cell") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          "group rounded-md border-l-2 px-2 py-1.5 text-xs leading-tight cursor-grab select-none",
          color.bg,
          color.text,
          color.borderL,
          isDragging && "opacity-30",
        )}
      >
        <div className="flex items-center justify-between gap-1">
          <div className="min-w-0 truncate">
            <span className="font-semibold">{initials}</span>
            <span className="ml-1 opacity-80">{name.split(" ")[0]}</span>
          </div>
          {dispatch && shiftId && (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => dispatch({ type: "UNASSIGN_STUDENT", shiftId, studentId })}
              className="shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    )
  }

  // Pool sidebar chip — colored dot + full name, like dashboard legend
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg px-3 py-2 cursor-grab select-none transition-colors",
        "hover:bg-accent",
        isDragging && "opacity-30",
      )}
    >
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold", color.bg, color.text)}>
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
      </div>
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/30 transition-colors group-hover:text-muted-foreground/60" />
    </div>
  )
}

/** Render-only clone for DragOverlay */
export function StudentChipOverlay({ name, colorIndex }: { name: string; colorIndex: number }) {
  const color = STUDENT_COLORS[colorIndex % STUDENT_COLORS.length]
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <div className={cn(
      "rounded-md border-l-2 px-2.5 py-1.5 text-xs leading-tight shadow-lg ring-1 ring-black/5",
      color.bg,
      color.text,
      color.borderL,
    )}>
      <span className="font-semibold">{initials}</span>
      <span className="ml-1 opacity-80">{name.split(" ")[0]}</span>
    </div>
  )
}

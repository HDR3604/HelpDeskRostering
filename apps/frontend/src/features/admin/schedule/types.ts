export interface EditorState {
  /** shift template ID → array of student IDs assigned to that shift */
  assignmentsByShift: Record<string, string[]>
  /** snapshot at load time for dirty-checking */
  originalAssignments: Record<string, string[]>
  /** all student IDs included in this schedule */
  includedStudentIds: string[]
  isDirty: boolean
  isGenerating: boolean
  isSaving: boolean
}

export type EditorAction =
  | { type: "ASSIGN_STUDENT"; shiftId: string; studentId: string }
  | { type: "UNASSIGN_STUDENT"; shiftId: string; studentId: string }
  | { type: "MOVE_STUDENT"; fromShiftId: string; toShiftId: string; studentId: string }
  | { type: "SET_GENERATED"; assignmentsByShift: Record<string, string[]> }
  | { type: "SET_GENERATING"; isGenerating: boolean }
  | { type: "SET_SAVING"; isSaving: boolean }
  | { type: "MARK_SAVED" }

// --- Drag ID encoding/decoding ---

export type DragSource =
  | { context: "pool"; studentId: string }
  | { context: "cell"; shiftId: string; studentId: string }

export function buildDragId(source: DragSource): string {
  if (source.context === "pool") return `pool::${source.studentId}`
  return `cell::${source.shiftId}::${source.studentId}`
}

export function parseDragId(id: string): DragSource | null {
  const parts = id.split("::")
  if (parts[0] === "pool" && parts[1]) {
    return { context: "pool", studentId: parts[1] }
  }
  if (parts[0] === "cell" && parts[1] && parts[2]) {
    return { context: "cell", shiftId: parts[1], studentId: parts[2] }
  }
  return null
}

// Student color palette (matches mini-weekly-schedule dashboard style)
export const STUDENT_COLORS = [
  { bg: "bg-chart-1/15", text: "text-chart-1", dot: "bg-chart-1", border: "border-chart-1", borderL: "border-l-chart-1" },
  { bg: "bg-chart-2/15", text: "text-chart-2", dot: "bg-chart-2", border: "border-chart-2", borderL: "border-l-chart-2" },
  { bg: "bg-chart-3/15", text: "text-chart-3", dot: "bg-chart-3", border: "border-chart-3", borderL: "border-l-chart-3" },
  { bg: "bg-chart-4/15", text: "text-chart-4", dot: "bg-chart-4", border: "border-chart-4", borderL: "border-l-chart-4" },
  { bg: "bg-chart-5/15", text: "text-chart-5", dot: "bg-chart-5", border: "border-chart-5", borderL: "border-l-chart-5" },
  { bg: "bg-blue-500/15", text: "text-blue-500", dot: "bg-blue-500", border: "border-blue-500", borderL: "border-l-blue-500" },
  { bg: "bg-pink-500/15", text: "text-pink-500", dot: "bg-pink-500", border: "border-pink-500", borderL: "border-l-pink-500" },
  { bg: "bg-amber-500/15", text: "text-amber-500", dot: "bg-amber-500", border: "border-amber-500", borderL: "border-l-amber-500" },
]

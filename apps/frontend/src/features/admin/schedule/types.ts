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

// --- Availability check ---

/** Returns true if the student is available for every hour the shift covers. */
export function isStudentAvailableForShift(
  availability: Record<number, number[]> | undefined,
  shift: { day_of_week: number; start_time: string; end_time: string },
): boolean {
  if (!availability) return false
  const dayHours = availability[shift.day_of_week]
  if (!dayHours) return false
  const start = parseInt(shift.start_time.split(":")[0], 10)
  const end = parseInt(shift.end_time.split(":")[0], 10)
  for (let h = start; h < end; h++) {
    if (!dayHours.includes(h)) return false
  }
  return true
}

// Student color palette — distinct hues, visible in both light and dark mode
export const STUDENT_COLORS = [
  { bg: "bg-blue-100 dark:bg-blue-500/20", dot: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-emerald-100 dark:bg-emerald-500/20", dot: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-violet-100 dark:bg-violet-500/20", dot: "bg-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { bg: "bg-rose-100 dark:bg-rose-500/20", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  { bg: "bg-amber-100 dark:bg-amber-500/20", dot: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-teal-100 dark:bg-teal-500/20", dot: "bg-teal-500", text: "text-teal-600 dark:text-teal-400" },
  { bg: "bg-pink-100 dark:bg-pink-500/20", dot: "bg-pink-500", text: "text-pink-600 dark:text-pink-400" },
  { bg: "bg-sky-100 dark:bg-sky-500/20", dot: "bg-sky-500", text: "text-sky-600 dark:text-sky-400" },
]

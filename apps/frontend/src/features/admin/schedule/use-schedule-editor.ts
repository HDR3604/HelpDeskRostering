import { useReducer, useMemo, useCallback } from "react"
import { toast } from "sonner"
import type { ScheduleResponse, Assignment } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"
import type { Student } from "@/types/student"
import type { EditorState, EditorAction } from "./types"
import { autoGenerate } from "./auto-generate"

function isDirty(current: Record<string, string[]>, original: Record<string, string[]>): boolean {
  const allKeys = Array.from(new Set([...Object.keys(current), ...Object.keys(original)]))
  for (const key of allKeys) {
    const a = current[key] ?? []
    const b = original[key] ?? []
    if (a.length !== b.length) return true
    const sortedA = [...a].sort()
    const sortedB = [...b].sort()
    for (let i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) return true
    }
  }
  return false
}

function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "ASSIGN_STUDENT": {
      const current = state.assignmentsByShift[action.shiftId] ?? []
      if (current.includes(action.studentId)) return state
      const next = { ...state.assignmentsByShift, [action.shiftId]: [...current, action.studentId] }
      return { ...state, assignmentsByShift: next, isDirty: isDirty(next, state.originalAssignments) }
    }
    case "UNASSIGN_STUDENT": {
      const current = state.assignmentsByShift[action.shiftId] ?? []
      const next = { ...state.assignmentsByShift, [action.shiftId]: current.filter((id) => id !== action.studentId) }
      return { ...state, assignmentsByShift: next, isDirty: isDirty(next, state.originalAssignments) }
    }
    case "MOVE_STUDENT": {
      const fromList = (state.assignmentsByShift[action.fromShiftId] ?? []).filter((id) => id !== action.studentId)
      const toList = state.assignmentsByShift[action.toShiftId] ?? []
      if (toList.includes(action.studentId)) return state
      const next = { ...state.assignmentsByShift, [action.fromShiftId]: fromList, [action.toShiftId]: [...toList, action.studentId] }
      return { ...state, assignmentsByShift: next, isDirty: isDirty(next, state.originalAssignments) }
    }
    case "SET_GENERATED": {
      return { ...state, assignmentsByShift: action.assignmentsByShift, isDirty: isDirty(action.assignmentsByShift, state.originalAssignments), isGenerating: false }
    }
    case "SET_GENERATING":
      return { ...state, isGenerating: action.isGenerating }
    case "SET_SAVING":
      return { ...state, isSaving: action.isSaving }
    case "MARK_SAVED":
      return { ...state, originalAssignments: structuredClone(state.assignmentsByShift), isDirty: false, isSaving: false }
    default:
      return state
  }
}

function initializeState(schedule: ScheduleResponse, includedStudentIds: string[]): EditorState {
  const assignmentsByShift: Record<string, string[]> = {}
  for (const a of schedule.assignments) {
    if (!assignmentsByShift[a.shift_id]) assignmentsByShift[a.shift_id] = []
    assignmentsByShift[a.shift_id].push(a.assistant_id)
  }
  return {
    assignmentsByShift,
    originalAssignments: structuredClone(assignmentsByShift),
    includedStudentIds,
    isDirty: false,
    isGenerating: false,
    isSaving: false,
  }
}

export function useScheduleEditor(
  schedule: ScheduleResponse,
  shiftTemplates: ShiftTemplate[],
  students: Student[],
  onSave: (updated: ScheduleResponse) => void,
) {
  const includedStudentIds = students.map((s) => String(s.student_id))
  const [state, dispatch] = useReducer(editorReducer, initializeState(schedule, includedStudentIds))

  const assignedStudentIds = useMemo(() => {
    const set = new Set<string>()
    for (const ids of Object.values(state.assignmentsByShift)) {
      for (const id of ids) set.add(id)
    }
    return set
  }, [state.assignmentsByShift])

  const unassignedStudents = useMemo(
    () => students.filter((s) => !assignedStudentIds.has(String(s.student_id))),
    [students, assignedStudentIds],
  )

  const studentColorIndex = useMemo(() => {
    const map: Record<string, number> = {}
    includedStudentIds.forEach((id, i) => {
      map[id] = i % 8
    })
    return map
  }, [includedStudentIds])

  const handleGenerate = useCallback(async () => {
    dispatch({ type: "SET_GENERATING", isGenerating: true })
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1200))
    const generated = autoGenerate(shiftTemplates, students)
    dispatch({ type: "SET_GENERATED", assignmentsByShift: generated })
    toast.success("Schedule auto-generated", { description: "Review assignments and save when ready." })
  }, [shiftTemplates, students])

  const handleSave = useCallback(async () => {
    dispatch({ type: "SET_SAVING", isSaving: true })
    await new Promise((r) => setTimeout(r, 600))

    // Convert assignmentsByShift back to Assignment[]
    const shiftMap = new Map(shiftTemplates.map((s) => [s.id, s]))
    const assignments: Assignment[] = []
    for (const [shiftId, studentIds] of Object.entries(state.assignmentsByShift)) {
      const shift = shiftMap.get(shiftId)
      if (!shift) continue
      for (const studentId of studentIds) {
        assignments.push({
          assistant_id: studentId,
          shift_id: shiftId,
          day_of_week: shift.day_of_week,
          start: shift.start_time + ":00",
          end: shift.end_time + ":00",
        })
      }
    }

    const updated: ScheduleResponse = {
      ...schedule,
      assignments,
      updated_at: new Date().toISOString(),
    }
    onSave(updated)
    dispatch({ type: "MARK_SAVED" })
    toast.success("Schedule saved")
  }, [state.assignmentsByShift, shiftTemplates, schedule, onSave])

  return {
    state,
    dispatch,
    assignedStudentIds,
    unassignedStudents,
    studentColorIndex,
    handleGenerate,
    handleSave,
  }
}

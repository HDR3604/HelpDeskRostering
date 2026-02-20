import { useState, useEffect } from "react"
import type { ScheduleResponse, GenerationStatusUpdate, Assignment } from "@/types/schedule"
import type { Student } from "@/types/student"
import { MOCK_SHIFT_TEMPLATES } from "@/lib/mock-data"
import { autoGenerate } from "../auto-generate"

interface GenerationFormValues {
  title: string
  effectiveFrom: string
  effectiveTo: string
  configId: string
  studentIds: string[]
}

/** Probability (0-1) that a mock generation will fail */
const MOCK_FAIL_RATE = 0.15

export function useGenerationStatus(
  generationId: string | null,
  students: Student[],
  formValues: GenerationFormValues | null,
): { status: GenerationStatusUpdate | null; schedule: ScheduleResponse | null } {
  const [status, setStatus] = useState<GenerationStatusUpdate | null>(null)
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null)

  useEffect(() => {
    if (!generationId || !formValues) {
      setStatus(null)
      setSchedule(null)
      return
    }

    const timers: ReturnType<typeof setTimeout>[] = []

    const willFail = Math.random() < MOCK_FAIL_RATE

    const base: GenerationStatusUpdate = {
      id: generationId,
      status: "pending",
      schedule_id: null,
      error_message: null,
      started_at: null,
      completed_at: null,
      progress: 0,
    }

    // Immediately pending
    setStatus({ ...base })

    // After 800ms: running
    timers.push(setTimeout(() => {
      setStatus((prev) => prev ? { ...prev, status: "running", started_at: new Date().toISOString() } : prev)
    }, 800))

    // Outcome after generation delay
    const finishDelay = 2500 + Math.random() * 1500 // 2.5–4s

    timers.push(setTimeout(() => {
      if (willFail) {
        const isInfeasible = Math.random() < 0.5
        setStatus((prev) => prev ? {
          ...prev,
          status: isInfeasible ? "infeasible" : "failed",
          completed_at: new Date().toISOString(),
          error_message: isInfeasible
            ? "Could not find a feasible schedule with the given constraints."
            : "An unexpected error occurred during schedule generation.",
          progress: 0,
        } : prev)
        return
      }

      const scheduleId = `sched-${Date.now()}`

      // Run autoGenerate with the selected students
      const selectedStudents = students.filter((s) => formValues.studentIds.includes(String(s.student_id)))
      const assignmentsByShift = autoGenerate(MOCK_SHIFT_TEMPLATES, selectedStudents)

      // Convert to Assignment[]
      const shiftMap = new Map(MOCK_SHIFT_TEMPLATES.map((s) => [s.id, s]))
      const assignments: Assignment[] = []
      for (const [shiftId, studentIds] of Object.entries(assignmentsByShift)) {
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

      const newSchedule: ScheduleResponse = {
        schedule_id: scheduleId,
        title: formValues.title,
        is_active: false,
        assignments,
        created_at: new Date().toISOString(),
        created_by: "admin-001",
        updated_at: null,
        archived_at: null,
        effective_from: formValues.effectiveFrom,
        effective_to: formValues.effectiveTo,
        generation_id: generationId,
        config_id: formValues.configId,
      }

      setStatus((prev) => prev ? {
        ...prev,
        status: "completed",
        schedule_id: scheduleId,
        completed_at: new Date().toISOString(),
        progress: 100,
      } : prev)
      setSchedule(newSchedule)
    }, finishDelay))

    return () => {
      for (const t of timers) clearTimeout(t)
    }
  }, [generationId, students, formValues])

  return { status, schedule }
}

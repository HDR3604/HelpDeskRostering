import type { ShiftTemplate } from "@/types/shift-template"
import type { Student } from "@/types/student"

/** Simple greedy auto-generation algorithm */
export function autoGenerate(shifts: ShiftTemplate[], students: Student[]): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  const studentHours: Record<string, number> = {}

  for (const s of students) {
    studentHours[String(s.student_id)] = 0
  }

  // Fill neediest shifts first
  const sortedShifts = [...shifts].sort((a, b) => b.min_staff - a.min_staff)

  for (const shift of sortedShifts) {
    result[shift.id] = []
    const shiftStart = parseInt(shift.start_time.split(":")[0], 10)
    const shiftEnd = parseInt(shift.end_time.split(":")[0], 10)
    const shiftHours = shiftEnd - shiftStart

    const eligible = students.filter((student) => {
      const avail = student.availability[shift.day_of_week] || []
      for (let h = shiftStart; h < shiftEnd; h++) {
        if (!avail.includes(h)) return false
      }
      const sid = String(student.student_id)
      const currentHours = studentHours[sid] || 0
      if (student.max_weekly_hours && currentHours + shiftHours > student.max_weekly_hours) {
        return false
      }
      return true
    })

    // Spread load: assign students with fewest hours first
    eligible.sort((a, b) => (studentHours[String(a.student_id)] || 0) - (studentHours[String(b.student_id)] || 0))

    const target = shift.min_staff
    for (const student of eligible) {
      if (result[shift.id].length >= target) break
      const sid = String(student.student_id)
      result[shift.id].push(sid)
      studentHours[sid] = (studentHours[sid] || 0) + shiftHours
    }
  }

  return result
}

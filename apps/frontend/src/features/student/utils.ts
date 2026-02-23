import { getTodayWeekdayIndex } from "@/lib/constants"
import { parseHour } from "@/lib/format"
import type { Assignment } from "@/types/schedule"

/** Finds the next upcoming assignment (wraps to next week if all past). */
export function getNextAssignment(assignments: Assignment[]): Assignment | null {
  if (assignments.length === 0) return null

  const today = getTodayWeekdayIndex()
  const currentHour = new Date().getHours()

  const sorted = [...assignments].sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week
    return a.start.localeCompare(b.start)
  })

  for (const a of sorted) {
    const endHour = parseHour(a.end)
    if (a.day_of_week > today || (a.day_of_week === today && endHour > currentHour)) {
      return a
    }
  }

  return sorted[0]
}

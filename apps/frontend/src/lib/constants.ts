export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
export const WEEKDAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] as const
export const WEEKDAYS_LETTER = ["M", "T", "W", "T", "F"] as const
export const ALL_DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const
export const ALL_DAYS_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const

/** Converts JS `Date.getDay()` (Sun=0) to a Mon=0…Fri=4 index. */
export function getTodayWeekdayIndex(): number {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

/** Tailwind class strings for transcript grade letters. */
export function gradeColor(grade: string | null): string {
  if (!grade) return "text-muted-foreground"
  if (grade.startsWith("A")) return "text-emerald-600 dark:text-emerald-400"
  if (grade.startsWith("B")) return "text-blue-600 dark:text-blue-400"
  if (grade.startsWith("C")) return "text-amber-600 dark:text-amber-400"
  if (grade.startsWith("D") || grade.startsWith("F")) return "text-red-600 dark:text-red-400"
  return "text-muted-foreground"
}

/** Badge class strings for application statuses. */
export const APPLICATION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/15",
  accepted: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15",
  rejected: "bg-red-500/15 text-red-500 hover:bg-red-500/15",
}

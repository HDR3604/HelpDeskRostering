export const WEEKDAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const
export const WEEKDAYS_LETTER = ["M", "T", "W", "T", "F"] as const

/** Converts JS `Date.getDay()` (Sun=0) to a Mon=0…Fri=4 index. */
export function getTodayWeekdayIndex(): number {
  const jsDay = new Date().getDay()
  return jsDay === 0 ? 6 : jsDay - 1
}

/** Badge class strings for application statuses. */
export const APPLICATION_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/15",
  accepted: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15",
  rejected: "bg-red-500/15 text-red-500 hover:bg-red-500/15",
}

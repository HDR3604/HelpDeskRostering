/** Parses the hour component from a time string like "08:00" or "13:30:00". */
export function parseHour(timeStr: string): number {
  return parseInt(timeStr.split(":")[0], 10)
}

/** Formats a time string to 12-hour display: "08:00" → "8 AM", "00:00" → "12 AM". */
export function formatHour(timeStr: string): string {
  const hour = parseHour(timeStr)
  if (hour === 0) return "12 AM"
  if (hour === 12) return "12 PM"
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

/** Short 12-hour format: "08:00" → "8a", "13:00" → "1p". */
export function formatHourShort(timeStr: string): string {
  const hour = parseHour(timeStr)
  if (hour === 0) return "12a"
  if (hour === 12) return "12p"
  return hour < 12 ? `${hour}a` : `${hour - 12}p`
}

/** Formats a date string to short display: "2025-02-17" → "Feb 17". */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

/** Formats a date to medium display: "2025-02-17" → "Feb 17, 2025". */
export function formatDateMedium(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

/** Formats a date range: "Feb 17 — Feb 21" or "Feb 17 onwards". */
export function formatDateRange(from: string, to: string | null): string {
  return formatDateShort(from) + (to ? ` — ${formatDateShort(to)}` : " onwards")
}

/** Converts a Date to "YYYY-MM-DD" string. */
export function toDateString(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Duration in hours between two time strings: getShiftDuration("08:00", "10:00") → 2. */
export function getShiftDuration(start: string, end: string): number {
  return parseHour(end) - parseHour(start)
}

/** Total hours across a list of assignments with start/end time strings. */
export function getScheduledHours(assignments: { start: string; end: string }[]): number {
  return assignments.reduce((sum, a) => sum + getShiftDuration(a.start, a.end), 0)
}

/** Adds days to a date string: addDays("2025-02-17", 7) → "2025-02-24". */
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return toDateString(d)
}

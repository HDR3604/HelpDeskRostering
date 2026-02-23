const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const

function formatHour(hour: number): string {
    if (hour === 12) return '12 PM'
    if (hour > 12) return `${hour - 12} PM`
    return `${hour} AM`
}

/** Groups consecutive hours into ranges like "8 AM – 12 PM" */
function formatRanges(hours: number[]): string {
    if (hours.length === 0) return ''
    const sorted = [...hours].sort((a, b) => a - b)
    const ranges: string[] = []
    let start = sorted[0]
    let end = sorted[0]

    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] === end + 1) {
            end = sorted[i]
        } else {
            ranges.push(start === end ? formatHour(start) : `${formatHour(start)} – ${formatHour(end + 1)}`)
            start = sorted[i]
            end = sorted[i]
        }
    }
    ranges.push(start === end ? formatHour(start) : `${formatHour(start)} – ${formatHour(end + 1)}`)
    return ranges.join(', ')
}

interface AvailabilitySummaryProps {
    availability: Record<string, number[]>
}

export function AvailabilitySummary({ availability }: AvailabilitySummaryProps) {
    const totalHours = Object.values(availability).reduce((sum, s) => sum + s.length, 0)

    return (
        <div className="space-y-3">
            <div className="space-y-2">
                {DAYS.map((day, i) => {
                    const slots = availability[String(i)] ?? []
                    const allSelected = HOURS.every((h) => slots.includes(h))
                    return (
                        <div key={day} className="flex items-baseline gap-3 text-sm">
                            <span className="w-24 shrink-0 font-medium">{day}</span>
                            {slots.length === 0 ? (
                                <span className="text-muted-foreground">—</span>
                            ) : allSelected ? (
                                <span className="text-muted-foreground">All day</span>
                            ) : (
                                <span className="text-muted-foreground">{formatRanges(slots)}</span>
                            )}
                        </div>
                    )
                })}
            </div>
            <p className="text-xs text-muted-foreground">
                {totalHours} hour{totalHours !== 1 ? 's' : ''} total
            </p>
        </div>
    )
}

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const

function formatHour(hour: number): string {
    if (hour === 12) return '12:00 PM'
    if (hour > 12) return `${hour - 12}:00 PM`
    return `${hour}:00 AM`
}

type Availability = Record<string, number[]>

interface Step3Props {
    defaultValues?: Availability
    onNext: (availability: Availability) => void
    onBack: () => void
    error?: string
}

export function Step3Availability({
    defaultValues,
    onNext,
    onBack,
    error,
}: Step3Props) {
    const [selected, setSelected] = useState<Availability>(() => {
        // Initialize from defaults or empty
        const init: Availability = {}
        for (let d = 0; d < 5; d++) {
            init[String(d)] = defaultValues?.[String(d)] ?? []
        }
        return init
    })

    const [isDragging, setIsDragging] = useState(false)
    const [dragMode, setDragMode] = useState<'add' | 'remove'>('add')
    const [validationError, setValidationError] = useState(error ?? '')

    const isSelected = useCallback(
        (day: number, hour: number) => {
            return selected[String(day)]?.includes(hour) ?? false
        },
        [selected]
    )

    const toggleSlot = useCallback((day: number, hour: number) => {
        setSelected((prev) => {
            const key = String(day)
            const daySlots = prev[key] ?? []
            const has = daySlots.includes(hour)
            return {
                ...prev,
                [key]: has
                    ? daySlots.filter((h) => h !== hour)
                    : [...daySlots, hour].sort((a, b) => a - b),
            }
        })
        setValidationError('')
    }, [])

    const applySlot = useCallback(
        (day: number, hour: number, mode: 'add' | 'remove') => {
            setSelected((prev) => {
                const key = String(day)
                const daySlots = prev[key] ?? []
                const has = daySlots.includes(hour)
                if (mode === 'add' && !has) {
                    return { ...prev, [key]: [...daySlots, hour].sort((a, b) => a - b) }
                }
                if (mode === 'remove' && has) {
                    return { ...prev, [key]: daySlots.filter((h) => h !== hour) }
                }
                return prev
            })
            setValidationError('')
        },
        []
    )

    function handleMouseDown(day: number, hour: number) {
        const willAdd = !isSelected(day, hour)
        setDragMode(willAdd ? 'add' : 'remove')
        setIsDragging(true)
        toggleSlot(day, hour)
    }

    function handleMouseEnter(day: number, hour: number) {
        if (!isDragging) return
        applySlot(day, hour, dragMode)
    }

    function handleMouseUp() {
        setIsDragging(false)
    }

    function handleSubmit() {
        const hasAny = Object.values(selected).some((s) => s.length > 0)
        if (!hasAny) {
            setValidationError('Select at least one time slot.')
            return
        }
        onNext(selected)
    }

    const totalSelected = Object.values(selected).reduce(
        (sum, s) => sum + s.length,
        0
    )

    return (
        <div className="space-y-6" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Header */}
            <div className="text-center space-y-2">
                <h2 className="text-xl font-semibold">Available Times</h2>
                <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                    Please select what times you are available to work at the help desk.
                    <br />
                    <span className="text-xs">
                        Note: The system automatically assigns you times based on the times
                        selected.
                    </span>
                </p>
            </div>

            {/* Grid */}
            <div className="border rounded-lg overflow-hidden select-none">
                {/* Day headers */}
                <div className="grid grid-cols-[80px_repeat(5,1fr)] bg-muted/50">
                    <div className="p-2" />
                    {DAYS.map((day, i) => (
                        <div
                            key={day}
                            className="p-2 text-center font-medium text-sm border-l"
                        >
                            <span className="hidden sm:inline">{day}</span>
                            <span className="sm:hidden">{DAYS_SHORT[i]}</span>
                        </div>
                    ))}
                </div>

                {/* Time rows */}
                {HOURS.map((hour) => (
                    <div
                        key={hour}
                        className="grid grid-cols-[80px_repeat(5,1fr)] border-t"
                    >
                        {/* Time label */}
                        <div className="p-2 text-xs text-muted-foreground flex items-center justify-end pr-3 font-mono">
                            {formatHour(hour)}
                        </div>

                        {/* Day cells */}
                        {DAYS.map((_, dayIndex) => {
                            const active = isSelected(dayIndex, hour)
                            return (
                                <div
                                    key={`${dayIndex}-${hour}`}
                                    className={cn(
                                        'border-l p-1 cursor-pointer transition-colors duration-100',
                                        active
                                            ? 'bg-primary/80 hover:bg-primary/70'
                                            : 'bg-muted/20 hover:bg-muted/40'
                                    )}
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleMouseDown(dayIndex, hour)
                                    }}
                                    onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
                                    role="checkbox"
                                    aria-checked={active}
                                    aria-label={`${DAYS[dayIndex]} ${formatHour(hour)}`}
                                >
                                    <div
                                        className={cn(
                                            'w-full h-8 rounded-sm transition-colors',
                                            active ? 'bg-primary' : 'bg-transparent'
                                        )}
                                    />
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>

            {/* Summary + Error */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {totalSelected} slot{totalSelected !== 1 ? 's' : ''} selected
                </p>
                {validationError && (
                    <p className="text-destructive text-sm">{validationError}</p>
                )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" size="lg" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <Button type="button" size="lg" onClick={handleSubmit}>
                    Continue
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    )
}

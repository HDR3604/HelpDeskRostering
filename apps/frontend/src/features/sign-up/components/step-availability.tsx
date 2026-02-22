import { useState, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16] as const

function formatHour(hour: number): string {
    if (hour === 12) return '12 PM'
    if (hour > 12) return `${hour - 12} PM`
    return `${hour} AM`
}

type Availability = Record<string, number[]>

interface StepAvailabilityProps {
    defaultValues?: Availability
    onNext: (availability: Availability) => void
    onBack: () => void
}

export function StepAvailability({ defaultValues, onNext, onBack }: StepAvailabilityProps) {
    const [selected, setSelected] = useState<Availability>(() => {
        const init: Availability = {}
        for (let d = 0; d < 5; d++) {
            init[String(d)] = defaultValues?.[String(d)] ?? []
        }
        return init
    })

    const [isDragging, setIsDragging] = useState(false)
    const [dragMode, setDragMode] = useState<'add' | 'remove'>('add')
    const [validationError, setValidationError] = useState('')
    const gridRef = useRef<HTMLDivElement>(null)

    // Roving tabindex: track which cell is the tab stop
    const [activeCell, setActiveCell] = useState<[number, number]>([0, 0])

    const isSelected = useCallback(
        (day: number, hour: number) => selected[String(day)]?.includes(hour) ?? false,
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
        setDragMode(!isSelected(day, hour) ? 'add' : 'remove')
        setIsDragging(true)
        toggleSlot(day, hour)
        setActiveCell([day, HOURS.indexOf(hour as (typeof HOURS)[number])])
    }

    function handleMouseEnter(day: number, hour: number) {
        if (!isDragging) return
        applySlot(day, hour, dragMode)
    }

    function handleMouseUp() {
        setIsDragging(false)
    }

    // Touch support
    function getCellFromTouch(e: React.TouchEvent): { day: number; hour: number } | null {
        const touch = e.touches[0]
        if (!touch) return null
        const el = document.elementFromPoint(touch.clientX, touch.clientY)
        if (!el) return null
        const cell = el.closest('[data-day][data-hour]') as HTMLElement | null
        if (!cell) return null
        return {
            day: parseInt(cell.dataset.day!),
            hour: parseInt(cell.dataset.hour!),
        }
    }

    function handleTouchStart(e: React.TouchEvent) {
        const cell = getCellFromTouch(e)
        if (!cell) return
        setDragMode(!isSelected(cell.day, cell.hour) ? 'add' : 'remove')
        setIsDragging(true)
        toggleSlot(cell.day, cell.hour)
    }

    function handleTouchMove(e: React.TouchEvent) {
        if (!isDragging) return
        const cell = getCellFromTouch(e)
        if (!cell) return
        applySlot(cell.day, cell.hour, dragMode)
    }

    function handleTouchEnd() {
        setIsDragging(false)
    }

    function toggleDay(dayIndex: number) {
        setSelected((prev) => {
            const key = String(dayIndex)
            const daySlots = prev[key] ?? []
            const allSelected = HOURS.every((h) => daySlots.includes(h))
            return {
                ...prev,
                [key]: allSelected ? [] : [...HOURS].sort((a, b) => a - b),
            }
        })
        setValidationError('')
    }

    function clearAll() {
        const cleared: Availability = {}
        for (let d = 0; d < 5; d++) cleared[String(d)] = []
        setSelected(cleared)
        setValidationError('')
    }

    function handleSubmit() {
        const hasAny = Object.values(selected).some((s) => s.length > 0)
        if (!hasAny) {
            setValidationError('Select at least one time slot.')
            return
        }
        onNext(selected)
    }

    // Keyboard navigation — roving tabindex
    function focusCell(day: number, hourIndex: number) {
        const clampedDay = Math.max(0, Math.min(4, day))
        const clampedHour = Math.max(0, Math.min(HOURS.length - 1, hourIndex))
        setActiveCell([clampedDay, clampedHour])
        const hour = HOURS[clampedHour]
        const cell = gridRef.current?.querySelector(
            `[data-day="${clampedDay}"][data-hour="${hour}"]`
        ) as HTMLElement | null
        cell?.focus()
    }

    function handleCellKeyDown(e: React.KeyboardEvent, day: number, hour: number) {
        const hourIndex = HOURS.indexOf(hour as (typeof HOURS)[number])

        switch (e.key) {
            case ' ':
                e.preventDefault()
                toggleSlot(day, hour)
                break
            case 'ArrowRight':
                e.preventDefault()
                if (day < 4) focusCell(day + 1, hourIndex)
                break
            case 'ArrowLeft':
                e.preventDefault()
                if (day > 0) focusCell(day - 1, hourIndex)
                break
            case 'ArrowDown':
                e.preventDefault()
                if (hourIndex < HOURS.length - 1) focusCell(day, hourIndex + 1)
                break
            case 'ArrowUp':
                e.preventDefault()
                if (hourIndex > 0) focusCell(day, hourIndex - 1)
                break
        }
    }

    const totalSelected = Object.values(selected).reduce((sum, s) => sum + s.length, 0)

    return (
        <div className="space-y-5" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
            {/* Grid */}
            <div
                ref={gridRef}
                className="select-none touch-none"
                role="grid"
                aria-label="Availability schedule"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Day headers */}
                <div className="grid grid-cols-[56px_repeat(5,1fr)] gap-1 mb-1" role="row">
                    <div role="columnheader" />
                    {DAYS.map((day, i) => {
                        const daySlots = selected[String(i)] ?? []
                        const allSelected = HOURS.every((h) => daySlots.includes(h))
                        return (
                            <button
                                key={day}
                                type="button"
                                role="columnheader"
                                tabIndex={-1}
                                className={cn(
                                    'rounded-md py-2 text-center text-xs font-medium transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                                    allSelected
                                        ? 'bg-primary/15 text-primary'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                                )}
                                onClick={() => toggleDay(i)}
                                title={allSelected ? `Clear ${day}` : `Select all ${day}`}
                            >
                                <span className="hidden sm:inline">{day}</span>
                                <span className="sm:hidden">{DAYS_SHORT[i]}</span>
                            </button>
                        )
                    })}
                </div>

                {/* Time rows */}
                <div className="grid gap-1">
                    {HOURS.map((hour, hourIndex) => (
                        <div key={hour} className="grid grid-cols-[56px_repeat(5,1fr)] gap-1" role="row">
                            <div className="flex items-center justify-end pr-2 text-[11px] text-muted-foreground font-mono" role="rowheader">
                                {formatHour(hour)}
                            </div>
                            {DAYS.map((_, dayIndex) => {
                                const active = isSelected(dayIndex, hour)
                                const isActiveCell = activeCell[0] === dayIndex && activeCell[1] === hourIndex
                                return (
                                    <div
                                        key={`${dayIndex}-${hour}`}
                                        data-day={dayIndex}
                                        data-hour={hour}
                                        tabIndex={isActiveCell ? 0 : -1}
                                        className={cn(
                                            'h-8 rounded-md cursor-pointer transition-colors duration-100 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                                            active
                                                ? 'bg-primary hover:bg-primary/90'
                                                : 'bg-muted/40 hover:bg-muted/70'
                                        )}
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            handleMouseDown(dayIndex, hour)
                                        }}
                                        onMouseEnter={() => handleMouseEnter(dayIndex, hour)}
                                        onFocus={() => setActiveCell([dayIndex, hourIndex])}
                                        onKeyDown={(e) => handleCellKeyDown(e, dayIndex, hour)}
                                        role="gridcell"
                                        aria-checked={active}
                                        aria-label={`${DAYS[dayIndex]} ${formatHour(hour)}`}
                                    />
                                )
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Summary + Error + Clear */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {totalSelected} hour{totalSelected !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-3">
                    {validationError && (
                        <p className="text-destructive text-sm">{validationError}</p>
                    )}
                    {totalSelected > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
                            <RotateCcw className="size-3.5 mr-1" />
                            Clear
                        </Button>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <form
                className="flex items-center gap-3 pt-2"
                onSubmit={(e) => {
                    e.preventDefault()
                    handleSubmit()
                }}
            >
                <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <div className="flex-1" />
                <Button type="submit">
                    Continue
                    <ArrowRight className="size-4" />
                </Button>
            </form>
        </div>
    )
}

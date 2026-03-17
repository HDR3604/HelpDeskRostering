import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { cn } from '@/lib/utils'
import { getPaymentColumns, HOURLY_RATE } from '../columns/payment-columns'
import { MOCK_HOURS_WORKED } from '@/lib/mock-data'
import { getApplicationStatus } from '@/types/student'
import { TranscriptDialog } from '@/features/admin/components/transcript-dialog'
import { useStudents } from '@/features/admin/student-management/student-context'
import type { PaymentEntry } from '../columns/payment-columns'
import type { Student } from '@/types/student'
import type { RowSelectionState } from '@tanstack/react-table'
import {
    Download,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
} from 'lucide-react'

// --- Period utilities ---

interface Period {
    label: string
    shortLabel: string
    start: string
    end: string
}

const SHORT_FMT = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
})

function generateFortnightlyPeriods(year: number): Period[] {
    const periods: Period[] = []

    const jan1 = new Date(year, 0, 1)
    const dayOfWeek = jan1.getDay()
    const daysUntilMonday =
        dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 0 : 8 - dayOfWeek
    const firstMonday = new Date(year, 0, 1 + daysUntilMonday)

    let start = new Date(firstMonday)
    while (start.getFullYear() === year) {
        const end = new Date(start)
        end.setDate(end.getDate() + 13)

        const shortLabel = `${SHORT_FMT.format(start)} – ${SHORT_FMT.format(end)}`

        periods.push({
            label: `${shortLabel}, ${year}`,
            shortLabel,
            start: start.toISOString().slice(0, 10),
            end: end.toISOString().slice(0, 10),
        })

        start = new Date(end)
        start.setDate(start.getDate() + 1)
    }

    return periods
}

function findCurrentPeriodIdx(periods: Period[]): number {
    const today = new Date().toISOString().slice(0, 10)
    const idx = periods.findIndex((p) => p.start <= today && today <= p.end)
    return idx >= 0 ? idx : periods.length - 1
}

function buildPaymentData(period: Period, students: Student[]): PaymentEntry[] {
    return students
        .filter((s) => getApplicationStatus(s) === 'accepted')
        .map((s) => {
            const hoursRecord = MOCK_HOURS_WORKED.find(
                (student) => student.name === `${s.first_name} ${s.last_name}`,
            )
            const hours = hoursRecord ? hoursRecord.hours : 0
            return {
                student: s,
                periodStart: period.start,
                periodEnd: period.end,
                hoursWorked: hours,
                grossAmount: hours * HOURLY_RATE,
                processedAt: null,
            }
        })
}

// --- Component ---

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_YEAR_PERIODS = generateFortnightlyPeriods(CURRENT_YEAR)
const CURRENT_PERIOD_IDX = findCurrentPeriodIdx(CURRENT_YEAR_PERIODS)

export function PaymentsCentre() {
    const { students } = useStudents()
    const [year, setYear] = useState(CURRENT_YEAR)
    const [periodIdx, setPeriodIdx] = useState(CURRENT_PERIOD_IDX)
    const [pickerOpen, setPickerOpen] = useState(false)
    const [pickerYear, setPickerYear] = useState(CURRENT_YEAR)

    const periods = useMemo(() => generateFortnightlyPeriods(year), [year])
    const pickerPeriods = useMemo(
        () => generateFortnightlyPeriods(pickerYear),
        [pickerYear],
    )
    const currentPeriod = periods[periodIdx]

    const [payments, setPayments] = useState<PaymentEntry[]>([])

    // Rebuild payment data when students load or period changes
    useEffect(() => {
        if (students.length > 0) {
            setPayments(buildPaymentData(currentPeriod, students))
        }
    }, [students, currentPeriod])
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [confirmAction, setConfirmAction] = useState<
        | { type: 'process'; entry: PaymentEntry }
        | { type: 'revert'; entry: PaymentEntry }
        | { type: 'bulk-process'; indices: number[] }
        | null
    >(null)

    const isAtCurrent =
        year === CURRENT_YEAR && periodIdx === CURRENT_PERIOD_IDX

    // Scroll selected period into view when picker opens
    const listRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (pickerOpen && listRef.current) {
            const active = listRef.current.querySelector('[data-active="true"]')
            active?.scrollIntoView({ block: 'center' })
        }
    }, [pickerOpen, pickerYear])

    function selectPeriod(newYear: number, idx: number) {
        setYear(newYear)
        setPeriodIdx(idx)
        setRowSelection({})
        setPickerOpen(false)
    }

    function stepPeriod(delta: number) {
        let newYear = year
        let newIdx = periodIdx + delta

        if (newIdx < 0) {
            newYear -= 1
            const prevPeriods = generateFortnightlyPeriods(newYear)
            newIdx = prevPeriods.length - 1
        } else if (newIdx >= periods.length) {
            newYear += 1
            newIdx = 0
        }

        setYear(newYear)
        setPeriodIdx(newIdx)
        setRowSelection({})
    }

    function goToToday() {
        selectPeriod(CURRENT_YEAR, CURRENT_PERIOD_IDX)
    }

    const selectedIndices = Object.keys(rowSelection)
        .filter((k) => rowSelection[k])
        .map(Number)

    function handleProcessSelected() {
        setConfirmAction({ type: 'bulk-process', indices: selectedIndices })
    }

    function handleGenerateSheet() {
        const count =
            selectedIndices.length > 0
                ? selectedIndices.length
                : payments.length
        toast.success('Payment sheet generated', {
            description: `Exported ${count} record${count > 1 ? 's' : ''} for ${currentPeriod.label}`,
        })
    }

    const totalHours = useMemo(
        () => payments.reduce((sum, p) => sum + p.hoursWorked, 0),
        [payments],
    )
    const totalAmount = useMemo(
        () => payments.reduce((sum, p) => sum + p.grossAmount, 0),
        [payments],
    )
    const pendingCount = useMemo(
        () => payments.filter((p) => !p.processedAt).length,
        [payments],
    )

    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )

    const handleProcess = useCallback((entry: PaymentEntry) => {
        setConfirmAction({ type: 'process', entry })
    }, [])

    const handleRevert = useCallback((entry: PaymentEntry) => {
        setConfirmAction({ type: 'revert', entry })
    }, [])

    function handleConfirm() {
        if (!confirmAction) return

        switch (confirmAction.type) {
            case 'process': {
                const now = new Date().toISOString()
                setPayments((prev) =>
                    prev.map((p) =>
                        p.student.student_id ===
                        confirmAction.entry.student.student_id
                            ? { ...p, processedAt: now }
                            : p,
                    ),
                )
                toast.success(
                    `Processed payment for ${confirmAction.entry.student.first_name} ${confirmAction.entry.student.last_name}`,
                )
                break
            }
            case 'revert': {
                setPayments((prev) =>
                    prev.map((p) =>
                        p.student.student_id ===
                        confirmAction.entry.student.student_id
                            ? { ...p, processedAt: null }
                            : p,
                    ),
                )
                toast.success(
                    `Reverted payment for ${confirmAction.entry.student.first_name} ${confirmAction.entry.student.last_name}`,
                )
                break
            }
            case 'bulk-process': {
                const now = new Date().toISOString()
                setPayments((prev) =>
                    prev.map((p, i) =>
                        confirmAction.indices.includes(i)
                            ? { ...p, processedAt: now }
                            : p,
                    ),
                )
                setRowSelection({})
                toast.success(
                    `Processed ${confirmAction.indices.length} payment${confirmAction.indices.length > 1 ? 's' : ''}`,
                )
                break
            }
        }

        setConfirmAction(null)
    }

    function getConfirmProps(): {
        title: string
        description: React.ReactNode
        confirmLabel: string
    } {
        if (!confirmAction)
            return { title: '', description: '', confirmLabel: '' }

        switch (confirmAction.type) {
            case 'process':
                return {
                    title: 'Process Payment',
                    description: `Are you sure you want to mark the payment for ${confirmAction.entry.student.first_name} ${confirmAction.entry.student.last_name} as processed?`,
                    confirmLabel: 'Process',
                }
            case 'revert':
                return {
                    title: 'Revert Payment',
                    description: `Are you sure you want to revert the payment for ${confirmAction.entry.student.first_name} ${confirmAction.entry.student.last_name} back to pending?`,
                    confirmLabel: 'Revert',
                }
            case 'bulk-process':
                return {
                    title: 'Process Payments',
                    description: `Are you sure you want to mark ${confirmAction.indices.length} payment${confirmAction.indices.length > 1 ? 's' : ''} as processed?`,
                    confirmLabel: `Process (${confirmAction.indices.length})`,
                }
        }
    }

    const confirmProps = getConfirmProps()

    const columns = useMemo(
        () =>
            getPaymentColumns({
                onProcess: handleProcess,
                onRevert: handleRevert,
                onViewTranscript: setTranscriptStudent,
            }),
        [handleProcess, handleRevert],
    )

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle>Payroll</CardTitle>
                                {pendingCount > 0 ? (
                                    <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                                        {pendingCount} pending
                                    </Badge>
                                ) : (
                                    <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                        All processed
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Process fortnightly payments &middot; $
                                {HOURLY_RATE.toFixed(2)}/hr
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => stepPeriod(-1)}
                            >
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Popover
                                open={pickerOpen}
                                onOpenChange={(open) => {
                                    setPickerOpen(open)
                                    if (open) setPickerYear(year)
                                }}
                            >
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        className="rounded-md px-2 py-1 text-sm font-medium tabular-nums text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                    >
                                        {currentPeriod.label}
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-0"
                                    align="center"
                                >
                                    <div className="flex items-center justify-between border-b px-3 py-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() =>
                                                setPickerYear((y) => y - 1)
                                            }
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <span className="text-sm font-semibold tabular-nums">
                                            {pickerYear}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() =>
                                                setPickerYear((y) => y + 1)
                                            }
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                    <div
                                        ref={listRef}
                                        className="max-h-52 overflow-y-auto p-1"
                                    >
                                        {pickerPeriods.map((p, i) => {
                                            const isSelected =
                                                pickerYear === year &&
                                                i === periodIdx
                                            const isCurrent =
                                                pickerYear === CURRENT_YEAR &&
                                                i === CURRENT_PERIOD_IDX
                                            return (
                                                <button
                                                    key={p.start}
                                                    type="button"
                                                    data-active={isSelected}
                                                    onClick={() =>
                                                        selectPeriod(
                                                            pickerYear,
                                                            i,
                                                        )
                                                    }
                                                    className={cn(
                                                        'w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                                                        isSelected &&
                                                            'bg-accent font-medium',
                                                    )}
                                                >
                                                    <span>{p.shortLabel}</span>
                                                    {isCurrent && (
                                                        <span className="text-[10px] text-muted-foreground">
                                                            Current
                                                        </span>
                                                    )}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </PopoverContent>
                            </Popover>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => stepPeriod(1)}
                            >
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            {!isAtCurrent && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={goToToday}
                                >
                                    <CalendarDays className="mr-1 h-3.5 w-3.5" />
                                    Today
                                </Button>
                            )}
                            <Separator
                                orientation="vertical"
                                className="mx-1 h-4"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGenerateSheet}
                            >
                                <Download className="mr-1 h-3.5 w-3.5" />
                                {selectedIndices.length > 0
                                    ? `Export (${selectedIndices.length})`
                                    : 'Export All'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {selectedIndices.length > 0 && (
                        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-3 py-2 mb-3">
                            <span className="text-sm text-muted-foreground">
                                {selectedIndices.length} selected
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleProcessSelected}
                            >
                                <CheckCircle className="mr-1 h-3.5 w-3.5" />
                                Mark as Processed
                            </Button>
                        </div>
                    )}
                    <DataTable
                        columns={columns}
                        data={payments}
                        searchPlaceholder="Search by name"
                        globalFilter
                        enableRowSelection
                        rowSelection={rowSelection}
                        onRowSelectionChange={setRowSelection}
                        emptyMessage="No payment records found."
                        pageSize={5}
                    />
                    <Separator className="my-4" />
                    <div className="flex justify-end gap-6 text-sm">
                        <span className="text-muted-foreground">
                            Total Hours{' '}
                            <span className="ml-1 font-medium text-foreground tabular-nums">
                                {totalHours}
                            </span>
                        </span>
                        <span className="text-muted-foreground">
                            Total{' '}
                            <span className="ml-1 font-medium text-foreground tabular-nums">
                                ${totalAmount.toFixed(2)}
                            </span>
                        </span>
                    </div>
                </CardContent>
            </Card>
            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open) setConfirmAction(null)
                }}
                title={confirmProps.title}
                description={confirmProps.description}
                confirmLabel={confirmProps.confirmLabel}
                onConfirm={handleConfirm}
                destructive={confirmAction?.type === 'revert'}
            />
            <TranscriptDialog
                student={transcriptStudent}
                open={transcriptStudent !== null}
                onOpenChange={(open) => {
                    if (!open) setTranscriptStudent(null)
                }}
            />
        </>
    )
}

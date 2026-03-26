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
import { TranscriptDialog } from '@/features/admin/components/transcript-dialog'
import { useStudents } from '@/features/admin/student-management/student-context'
import {
    usePayments,
    useGeneratePayments,
    useProcessPayment,
    useRevertPayment,
    useBulkProcessPayments,
    usePrefetchPayments,
} from '@/lib/queries/payments'
import { exportPaymentsCsv } from '@/lib/api/payments'
import type { PaymentEntry } from '../columns/payment-columns'
import type { Student } from '@/types/student'
import type { RowSelectionState } from '@tanstack/react-table'
import {
    Download,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    DollarSign,
    RefreshCw,
    Loader2,
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

export function generateFortnightlyPeriods(year: number): Period[] {
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

export function findCurrentPeriodIdx(periods: Period[]): number {
    const today = new Date().toISOString().slice(0, 10)
    const idx = periods.findIndex((p) => p.start <= today && today <= p.end)
    return idx >= 0 ? idx : periods.length - 1
}

function getAdjacentPeriod(
    year: number,
    periodIdx: number,
    periods: Period[],
    delta: number,
): { year: number; period: Period } | null {
    let newYear = year
    let newIdx = periodIdx + delta
    if (newIdx < 0) {
        newYear -= 1
        const prev = generateFortnightlyPeriods(newYear)
        newIdx = prev.length - 1
        return { year: newYear, period: prev[newIdx] }
    }
    if (newIdx >= periods.length) {
        newYear += 1
        const next = generateFortnightlyPeriods(newYear)
        return { year: newYear, period: next[0] }
    }
    return { year: newYear, period: periods[newIdx] }
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

    // Fetch payments from API
    const {
        data: apiPayments = [],
        isLoading,
        isFetching,
    } = usePayments(currentPeriod.start, currentPeriod.end)

    // Prefetch adjacent periods for instant navigation
    const prefetchPayments = usePrefetchPayments()
    useEffect(() => {
        const prev = getAdjacentPeriod(year, periodIdx, periods, -1)
        const next = getAdjacentPeriod(year, periodIdx, periods, 1)
        if (prev) prefetchPayments(prev.period.start, prev.period.end)
        if (next) prefetchPayments(next.period.start, next.period.end)
    }, [year, periodIdx, periods, prefetchPayments])

    // Build a student lookup map
    const studentMap = useMemo(() => {
        const map = new Map<number, Student>()
        for (const s of students) {
            map.set(s.student_id, s)
        }
        return map
    }, [students])

    // Merge API payment data with student objects
    const payments: PaymentEntry[] = useMemo(() => {
        return apiPayments
            .map((p) => {
                const student = studentMap.get(p.student_id)
                if (!student) return null
                return {
                    paymentId: p.payment_id,
                    student,
                    periodStart: p.period_start,
                    periodEnd: p.period_end,
                    hoursWorked: p.hours_worked,
                    grossAmount: p.gross_amount,
                    processedAt: p.processed_at,
                }
            })
            .filter((p): p is PaymentEntry => p !== null)
    }, [apiPayments, studentMap])

    // Mutations
    const generateMutation = useGeneratePayments()
    const processMutation = useProcessPayment()
    const revertMutation = useRevertPayment()
    const bulkProcessMutation = useBulkProcessPayments()

    const isConfirmPending =
        processMutation.isPending ||
        revertMutation.isPending ||
        bulkProcessMutation.isPending

    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [confirmAction, setConfirmAction] = useState<
        | { type: 'process'; entry: PaymentEntry }
        | { type: 'revert'; entry: PaymentEntry }
        | { type: 'bulk-process'; entries: PaymentEntry[] }
        | null
    >(null)
    const [isExporting, setIsExporting] = useState(false)

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

    const selectedEntries = selectedIndices
        .map((i) => payments[i])
        .filter(Boolean)

    function handleProcessSelected() {
        setConfirmAction({ type: 'bulk-process', entries: selectedEntries })
    }

    function handleGeneratePayments() {
        generateMutation.mutate({
            periodStart: currentPeriod.start,
            periodEnd: currentPeriod.end,
        })
    }

    function handleExport() {
        const pendingCount = payments.filter((p) => !p.processedAt).length
        if (pendingCount > 0) {
            toast.warning(
                `${pendingCount} pending payment${pendingCount > 1 ? 's' : ''} will be excluded from the export. Only processed payments are included.`,
            )
        }

        const processedCount = payments.length - pendingCount
        if (processedCount === 0) {
            toast.error('No processed payments to export.')
            return
        }

        setIsExporting(true)
        exportPaymentsCsv(currentPeriod.start, currentPeriod.end)
            .then(() => {
                toast.success('Payment sheet exported')
            })
            .catch(() => {
                toast.error('Failed to export payment sheet')
            })
            .finally(() => {
                setIsExporting(false)
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

        const onSettled = () => setConfirmAction(null)

        switch (confirmAction.type) {
            case 'process': {
                processMutation.mutate(confirmAction.entry.paymentId, {
                    onSuccess: () => {
                        toast.success(
                            `Processed payment for ${confirmAction.entry.student.first_name} ${confirmAction.entry.student.last_name}`,
                        )
                    },
                    onSettled,
                })
                break
            }
            case 'revert': {
                revertMutation.mutate(confirmAction.entry.paymentId, {
                    onSuccess: () => {
                        toast.success(
                            `Reverted payment for ${confirmAction.entry.student.first_name} ${confirmAction.entry.student.last_name}`,
                        )
                    },
                    onSettled,
                })
                break
            }
            case 'bulk-process': {
                const ids = confirmAction.entries.map((e) => e.paymentId)
                bulkProcessMutation.mutate(ids, {
                    onSuccess: () => {
                        setRowSelection({})
                    },
                    onSettled,
                })
                break
            }
        }
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
                    description: `Are you sure you want to mark ${confirmAction.entries.length} payment${confirmAction.entries.length > 1 ? 's' : ''} as processed?`,
                    confirmLabel: `Process (${confirmAction.entries.length})`,
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

    // --- Period picker (shared between all states) ---

    const periodPicker = (
        <div className="flex items-center gap-1">
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
                <PopoverContent className="w-64 p-0" align="center">
                    <div className="flex items-center justify-between border-b px-3 py-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setPickerYear((y) => y - 1)}
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
                            onClick={() => setPickerYear((y) => y + 1)}
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                    <div ref={listRef} className="max-h-52 overflow-y-auto p-1">
                        {pickerPeriods.map((p, i) => {
                            const isSelected =
                                pickerYear === year && i === periodIdx
                            const isCurrent =
                                pickerYear === CURRENT_YEAR &&
                                i === CURRENT_PERIOD_IDX
                            return (
                                <button
                                    key={p.start}
                                    type="button"
                                    data-active={isSelected}
                                    onClick={() => selectPeriod(pickerYear, i)}
                                    className={cn(
                                        'w-full flex items-center justify-between rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent',
                                        isSelected && 'bg-accent font-medium',
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
        </div>
    )

    // --- Render ---

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle>Payroll</CardTitle>
                                {!isLoading && payments.length > 0 && (
                                    <>
                                        {pendingCount > 0 ? (
                                            <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                                                {pendingCount} pending
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                                All processed
                                            </Badge>
                                        )}
                                    </>
                                )}
                                {isFetching && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            <CardDescription>
                                Process fortnightly payments &middot; $
                                {HOURLY_RATE.toFixed(2)}/hr
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {periodPicker}
                            <Separator
                                orientation="vertical"
                                className="mx-1 hidden h-4 sm:block"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleGeneratePayments}
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                )}
                                Sync
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleExport}
                                disabled={payments.length === 0 || isExporting}
                            >
                                {isExporting ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Download className="mr-1 h-3.5 w-3.5" />
                                )}
                                Export
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="size-7 animate-spin text-muted-foreground" />
                            <p className="mt-4 text-sm text-muted-foreground">
                                Loading payroll data...
                            </p>
                        </div>
                    ) : payments.length === 0 ? (
                        <div className="flex items-center justify-between rounded-lg border border-dashed px-4 py-6">
                            <div className="flex items-center gap-3">
                                <DollarSign className="size-5 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">
                                        No payroll data for this period
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Click Sync to calculate from time logs.
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleGeneratePayments}
                                disabled={generateMutation.isPending}
                            >
                                {generateMutation.isPending ? (
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                )}
                                Sync
                            </Button>
                        </div>
                    ) : (
                        <>
                            {selectedIndices.length > 0 && (
                                <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 mb-3 sm:gap-3">
                                    <span className="text-sm text-muted-foreground">
                                        {selectedIndices.length} selected
                                    </span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleProcessSelected}
                                        disabled={isConfirmPending}
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
                                        {totalHours.toFixed(2)}
                                    </span>
                                </span>
                                <span className="text-muted-foreground">
                                    Total{' '}
                                    <span className="ml-1 font-medium text-foreground tabular-nums">
                                        ${totalAmount.toFixed(2)}
                                    </span>
                                </span>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
            <ConfirmDialog
                open={confirmAction !== null}
                onOpenChange={(open) => {
                    if (!open && !isConfirmPending) setConfirmAction(null)
                }}
                title={confirmProps.title}
                description={confirmProps.description}
                confirmLabel={confirmProps.confirmLabel}
                onConfirm={handleConfirm}
                destructive={confirmAction?.type === 'revert'}
                loading={isConfirmPending}
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

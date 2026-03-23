import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
    LogIn,
    LogOut,
    MapPin,
    Loader2,
    CheckCircle2,
    XCircle,
    QrCode,
    CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
    useClockInStatus,
    useClockIn,
    useClockOut,
} from '@/lib/queries/time-logs'
import { useActiveSchedule } from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { useMyStudentProfile } from '@/lib/queries/students'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { playClockInTone, playClockOutTone, playErrorTone } from '@/lib/tones'
import { getApiErrorMessage } from '@/lib/error-messages'
import { ALL_DAYS_FULL, getTodayWeekdayIndex } from '@/lib/constants'
import { formatHour } from '@/lib/format'
import type { Assignment } from '@/types/schedule'
import type { ShiftTemplate } from '@/types/shift-template'

type GeoState =
    | { status: 'idle' }
    | { status: 'requesting' }
    | { status: 'granted'; lat: number; lng: number }
    | { status: 'denied'; message: string }

function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function formatDuration(entryAt: string): string {
    const diff = Date.now() - new Date(entryAt).getTime()
    const mins = Math.floor(diff / 60_000)
    if (mins < 1) return '0m'
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
}

function getTodayAssignment(
    assignments: Assignment[],
    shiftTemplates: ShiftTemplate[],
) {
    const today = getTodayWeekdayIndex()
    const match = assignments.find((a) => a.day_of_week === today)
    if (!match) return null
    const template = shiftTemplates.find((t) => t.id === match.shift_id)
    return {
        day: ALL_DAYS_FULL[match.day_of_week],
        start: formatHour(match.start),
        end: formatHour(match.end),
        name: template?.name ?? 'Shift',
    }
}

function LiveClock() {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    const time = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
    const seconds = now.toLocaleTimeString([], { second: '2-digit' }).slice(-2)

    return (
        <div className="flex items-baseline gap-1">
            <span className="text-5xl font-bold tabular-nums tracking-tight sm:text-6xl">
                {time}
            </span>
            <span className="text-2xl font-medium tabular-nums text-muted-foreground sm:text-3xl">
                {seconds}
            </span>
        </div>
    )
}

export function StudentClock() {
    useDocumentTitle('Time Clock')

    const { code: urlCode } = useSearch({ from: '/_app/clock' })
    const statusQuery = useClockInStatus()
    const clockInMutation = useClockIn()
    const clockOutMutation = useClockOut()

    const profileQuery = useMyStudentProfile()
    const scheduleQuery = useActiveSchedule()
    const shiftTemplatesQuery = useShiftTemplates()

    const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
    const [elapsed, setElapsed] = useState('')
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const status = statusQuery.data
    const isClockedIn = status?.is_clocked_in ?? false

    const student = profileQuery.data
    const schedule = scheduleQuery.data
    const shiftTemplates = shiftTemplatesQuery.data ?? []

    const myAssignments = useMemo(() => {
        if (!schedule?.assignments || !student) return []
        const sid = String(student.student_id)
        return schedule.assignments.filter(
            (a) => String(a.assistant_id) === sid,
        )
    }, [schedule, student])

    const todayShift = useMemo(
        () => getTodayAssignment(myAssignments, shiftTemplates),
        [myAssignments, shiftTemplates],
    )

    useEffect(() => {
        if (!status?.current_log) return
        const update = () =>
            setElapsed(formatDuration(status.current_log!.entry_at))
        update()
        const id = setInterval(update, 30_000)
        return () => clearInterval(id)
    }, [status?.current_log])

    useEffect(() => {
        setErrorMessage(null)
    }, [isClockedIn])

    const requestLocation = useCallback((): Promise<{
        lat: number
        lng: number
    }> => {
        return new Promise((resolve, reject) => {
            setGeo({ status: 'requesting' })
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                    }
                    setGeo({ status: 'granted', ...coords })
                    resolve(coords)
                },
                (err) => {
                    const message =
                        err.code === err.PERMISSION_DENIED
                            ? 'Location access was denied. Please enable location permissions in your browser settings and try again.'
                            : 'Could not determine your location. Please check your connection and try again.'
                    setGeo({ status: 'denied', message })
                    reject(new Error(message))
                },
                { enableHighAccuracy: true, timeout: 10_000 },
            )
        })
    }, [])

    const handleClockIn = useCallback(async () => {
        if (!urlCode) return
        setErrorMessage(null)

        try {
            const { lat, lng } = await requestLocation()
            clockInMutation.mutate(
                { code: urlCode, longitude: lng, latitude: lat },
                {
                    onSuccess: () => playClockInTone(),
                    onError: (error) => {
                        playErrorTone()
                        setErrorMessage(getApiErrorMessage(error))
                    },
                },
            )
        } catch (err) {
            playErrorTone()
            if (err instanceof Error) setErrorMessage(err.message)
        }
    }, [urlCode, requestLocation, clockInMutation])

    const handleClockOut = useCallback(() => {
        setErrorMessage(null)
        clockOutMutation.mutate(undefined, {
            onSuccess: () => playClockOutTone(),
            onError: (error) => {
                playErrorTone()
                setErrorMessage(getApiErrorMessage(error))
            },
        })
    }, [clockOutMutation])

    const isActioning =
        clockInMutation.isPending ||
        clockOutMutation.isPending ||
        geo.status === 'requesting'

    if (statusQuery.isLoading) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4">
            {/* Hero clock */}
            <div className="text-center">
                <LiveClock />
                <p className="mt-1 text-sm text-muted-foreground">
                    {new Date().toLocaleDateString([], {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            {/* Status badge */}
            <div className="mt-6">
                <Badge
                    variant="outline"
                    className={
                        isClockedIn
                            ? 'gap-1.5 border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-600'
                            : 'gap-1.5 px-3 py-1 text-sm'
                    }
                >
                    {isClockedIn ? (
                        <>
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                            </span>
                            On Shift
                        </>
                    ) : (
                        'Off Shift'
                    )}
                </Badge>
            </div>

            {/* Main content area */}
            <div className="mt-8 w-full max-w-sm space-y-5">
                {isClockedIn && status?.current_log ? (
                    <>
                        {/* Clocked-in info panel */}
                        <div className="rounded-xl border bg-card p-5 space-y-4">
                            {status.current_shift && (
                                <div className="flex items-start gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                                        <CalendarDays className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {status.current_shift.name}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {status.current_shift.start_time}
                                            {' \u2013 '}
                                            {status.current_shift.end_time}
                                        </p>
                                    </div>
                                </div>
                            )}
                            <Separator />
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    <span>
                                        Clocked in at{' '}
                                        <span className="font-medium">
                                            {formatTime(
                                                status.current_log.entry_at,
                                            )}
                                        </span>
                                    </span>
                                </div>
                                <span className="tabular-nums text-muted-foreground">
                                    {elapsed}
                                </span>
                            </div>
                        </div>

                        {errorMessage && <ErrorBanner message={errorMessage} />}

                        <Button
                            onClick={handleClockOut}
                            disabled={isActioning}
                            variant="destructive"
                            size="lg"
                            className="h-14 w-full text-base"
                        >
                            {clockOutMutation.isPending ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <LogOut className="mr-2 h-5 w-5" />
                            )}
                            Clock Out
                        </Button>
                    </>
                ) : !urlCode ? (
                    <>
                        {/* No code state */}
                        <div className="rounded-xl border border-dashed p-8 text-center">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                                <QrCode className="h-8 w-8 text-primary" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold">
                                Scan to clock in
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                                Open your phone camera and scan the QR code
                                displayed at the help desk to start your shift.
                            </p>
                        </div>

                        {todayShift && <ShiftInfoPill shift={todayShift} />}

                        {!todayShift && scheduleQuery.isFetched && (
                            <p className="text-center text-sm text-muted-foreground">
                                No shift scheduled for today.
                            </p>
                        )}
                    </>
                ) : (
                    <>
                        {/* Has code — ready to clock in */}
                        {todayShift && <ShiftInfoPill shift={todayShift} />}

                        {errorMessage && <ErrorBanner message={errorMessage} />}

                        <Button
                            onClick={handleClockIn}
                            disabled={isActioning}
                            size="lg"
                            className="h-14 w-full text-base"
                        >
                            {isActioning ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <LogIn className="mr-2 h-5 w-5" />
                            )}
                            {geo.status === 'requesting'
                                ? 'Getting location\u2026'
                                : 'Clock In'}
                        </Button>

                        <p className="text-center text-xs text-muted-foreground">
                            <MapPin className="mr-1 inline h-3 w-3" />
                            Your location will be recorded for verification
                        </p>
                    </>
                )}
            </div>
        </div>
    )
}

function ShiftInfoPill({
    shift,
}: {
    shift: { name: string; start: string; end: string }
}) {
    return (
        <div className="flex items-center justify-between rounded-xl border bg-card px-5 py-3.5">
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <CalendarDays className="h-4 w-4 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-medium">{shift.name}</p>
                    <p className="text-xs text-muted-foreground">
                        Today's shift
                    </p>
                </div>
            </div>
            <p className="text-sm tabular-nums text-muted-foreground">
                {shift.start} – {shift.end}
            </p>
        </div>
    )
}

function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
            <p className="text-sm text-red-600">{message}</p>
        </div>
    )
}

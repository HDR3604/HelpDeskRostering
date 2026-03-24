import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
    LogIn,
    LogOut,
    MapPin,
    MapPinOff,
    Loader2,
    CheckCircle2,
    XCircle,
    QrCode,
    CalendarDays,
    LocateFixed,
    Timer,
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
import { getTodayWeekdayIndex } from '@/lib/constants'
import { formatHour } from '@/lib/format'
import { cn } from '@/lib/utils'
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

function formatShiftTime(time: string): string {
    const [h, m] = time.split(':').map(Number)
    const period = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return m
        ? `${hour}:${String(m).padStart(2, '0')} ${period}`
        : `${hour} ${period}`
}

interface TodayShift {
    name: string
    start: string
    end: string
}

function getTodayShifts(
    assignments: Assignment[],
    shiftTemplates: ShiftTemplate[],
): TodayShift[] {
    const today = getTodayWeekdayIndex()
    return assignments
        .filter((a) => a.day_of_week === today)
        .sort((a, b) => a.start.localeCompare(b.start))
        .map((a) => {
            const template = shiftTemplates.find((t) => t.id === a.shift_id)
            return {
                name: template?.name ?? 'Shift',
                start: formatHour(a.start),
                end: formatHour(a.end),
            }
        })
}

// ── Sub-components ──────────────────────────────────────────────────

function LiveClock() {
    const [now, setNow] = useState(() => new Date())

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000)
        return () => clearInterval(id)
    }, [])

    return (
        <span className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
            {now.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            })}
        </span>
    )
}

function ElapsedTimer({ entryAt }: { entryAt: string }) {
    const [elapsed, setElapsed] = useState('')

    useEffect(() => {
        const update = () => {
            const diff = Date.now() - new Date(entryAt).getTime()
            const hrs = Math.floor(diff / 3_600_000)
            const mins = Math.floor((diff % 3_600_000) / 60_000)
            const secs = Math.floor((diff % 60_000) / 1000)
            setElapsed(
                hrs > 0
                    ? `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
                    : `${mins}:${String(secs).padStart(2, '0')}`,
            )
        }
        update()
        const id = setInterval(update, 1000)
        return () => clearInterval(id)
    }, [entryAt])

    return (
        <span className="text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
            {elapsed}
        </span>
    )
}

// ── Main component ──────────────────────────────────────────────────

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
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [locationPermission, setLocationPermission] = useState<
        'unknown' | 'granted' | 'prompt' | 'denied' | 'unavailable'
    >('unknown')

    // Probe location permission on mount and pre-fetch if already granted
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationPermission('unavailable')
            return
        }
        if (!navigator.permissions) {
            setLocationPermission('prompt')
            return
        }

        navigator.permissions
            .query({ name: 'geolocation' })
            .then((result) => {
                setLocationPermission(result.state)
                result.addEventListener('change', () => {
                    setLocationPermission(result.state)
                })

                if (result.state === 'granted') {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            setGeo({
                                status: 'granted',
                                lat: pos.coords.latitude,
                                lng: pos.coords.longitude,
                            })
                        },
                        () => {},
                        { enableHighAccuracy: true, timeout: 10_000 },
                    )
                }
            })
            .catch(() => setLocationPermission('prompt'))
    }, [])

    useEffect(() => {
        if (geo.status === 'granted') setLocationPermission('granted')
        if (geo.status === 'denied') setLocationPermission('denied')
    }, [geo.status])

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

    const todayShifts = useMemo(
        () => getTodayShifts(myAssignments, shiftTemplates),
        [myAssignments, shiftTemplates],
    )

    useEffect(() => {
        setErrorMessage(null)
    }, [isClockedIn])

    const requestLocation = useCallback((): Promise<{
        lat: number
        lng: number
    }> => {
        if (geo.status === 'granted') {
            return Promise.resolve({ lat: geo.lat, lng: geo.lng })
        }

        if (!navigator.geolocation) {
            const message =
                'Location services are not available in this browser. Please use a supported browser.'
            setGeo({ status: 'denied', message })
            return Promise.reject(new Error(message))
        }

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
    }, [geo])

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

    if (statusQuery.isError) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
                <XCircle className="h-10 w-10 text-red-500" />
                <div>
                    <p className="font-medium">
                        Could not load your clock-in status
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {getApiErrorMessage(statusQuery.error)}
                    </p>
                </div>
                <Button variant="outline" onClick={() => statusQuery.refetch()}>
                    Try again
                </Button>
            </div>
        )
    }

    // ── On-shift view ───────────────────────────────────────────────
    if (isClockedIn && status?.current_log) {
        return (
            <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4">
                {/* Elapsed timer — hero element */}
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 text-emerald-500">
                        <Timer className="h-5 w-5" />
                        <span className="text-sm font-medium">
                            Time on shift
                        </span>
                    </div>
                    <div className="mt-2">
                        <ElapsedTimer entryAt={status.current_log.entry_at} />
                    </div>
                    <Badge
                        variant="outline"
                        className="mt-3 gap-1.5 border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-600"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        </span>
                        On Shift
                    </Badge>
                </div>

                <div className="mt-8 w-full max-w-sm space-y-4">
                    {/* Shift details */}
                    <div className="rounded-xl border bg-card p-4 space-y-3">
                        {status.current_shift && (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm font-medium">
                                        {status.current_shift.name}
                                    </span>
                                </div>
                                <span className="text-sm tabular-nums text-muted-foreground">
                                    {formatShiftTime(
                                        status.current_shift.start_time,
                                    )}
                                    {' \u2013 '}
                                    {formatShiftTime(
                                        status.current_shift.end_time,
                                    )}
                                </span>
                            </div>
                        )}
                        <Separator />
                        <div className="flex items-center gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            <span className="text-muted-foreground">
                                Clocked in at{' '}
                                <span className="font-medium text-foreground">
                                    {formatTime(status.current_log.entry_at)}
                                </span>
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
                </div>
            </div>
        )
    }

    // ── Off-shift view ──────────────────────────────────────────────
    return (
        <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-4">
            {/* Live clock */}
            <div className="text-center">
                <LiveClock />
                <p className="mt-1.5 text-sm text-muted-foreground">
                    {new Date().toLocaleDateString([], {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            <div className="mt-3">
                <Badge variant="outline" className="gap-1.5 px-3 py-1 text-sm">
                    Off Shift
                </Badge>
            </div>

            <div className="mt-8 w-full max-w-sm space-y-4">
                {!urlCode ? (
                    <>
                        {/* No code — scan prompt */}
                        <div className="rounded-xl border border-dashed p-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                                <QrCode className="h-7 w-7 text-primary" />
                            </div>
                            <h2 className="mt-4 text-lg font-semibold">
                                Scan to clock in
                            </h2>
                            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                Open your camera and scan the QR code at the
                                help desk to start your shift.
                            </p>
                        </div>

                        <TodayShiftsList
                            shifts={todayShifts}
                            loaded={scheduleQuery.isSuccess}
                        />
                        <LocationBanner permission={locationPermission} />
                    </>
                ) : (
                    <>
                        {/* Has code — ready to clock in */}
                        <TodayShiftsList
                            shifts={todayShifts}
                            loaded={scheduleQuery.isSuccess}
                        />

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

                        <LocationBanner permission={locationPermission} />
                    </>
                )}
            </div>
        </div>
    )
}

// ── Helper components ───────────────────────────────────────────────

const VISIBLE_SHIFTS = 3

function TodayShiftsList({
    shifts,
    loaded,
}: {
    shifts: TodayShift[]
    loaded: boolean
}) {
    const [expanded, setExpanded] = useState(false)

    if (shifts.length === 0) {
        if (!loaded) return null
        return (
            <p className="text-center text-sm text-muted-foreground">
                No shift scheduled for today.
            </p>
        )
    }

    const canCollapse = shifts.length > VISIBLE_SHIFTS
    const visible =
        canCollapse && !expanded ? shifts.slice(0, VISIBLE_SHIFTS) : shifts
    const hiddenCount = shifts.length - VISIBLE_SHIFTS

    return (
        <div className="space-y-1.5">
            {visible.map((shift, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
                >
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <CalendarDays className="h-4 w-4 text-primary" />
                        </div>
                        <p className="truncate text-sm font-medium">
                            {shift.name}
                        </p>
                    </div>
                    <p className="shrink-0 pl-3 text-sm tabular-nums text-muted-foreground">
                        {shift.start} – {shift.end}
                    </p>
                </div>
            ))}
            {canCollapse && (
                <button
                    type="button"
                    onClick={() => setExpanded((e) => !e)}
                    className="w-full py-1.5 text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                    {expanded ? 'Show less' : `Show ${hiddenCount} more`}
                </button>
            )}
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

function LocationBanner({
    permission,
}: {
    permission: 'unknown' | 'granted' | 'prompt' | 'denied' | 'unavailable'
}) {
    if (permission === 'unknown') return null

    const config = {
        granted: {
            icon: LocateFixed,
            text: 'Location access enabled',
            className:
                'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
        },
        prompt: {
            icon: MapPin,
            text: 'Location permission will be requested when you clock in',
            className: 'border-border bg-muted/50 text-muted-foreground',
        },
        denied: {
            icon: MapPinOff,
            text: 'Location access blocked. Enable it in your browser settings to clock in.',
            className: 'border-red-500/30 bg-red-500/10 text-red-600',
        },
        unavailable: {
            icon: MapPinOff,
            text: 'Location services are not available in this browser.',
            className: 'border-red-500/30 bg-red-500/10 text-red-600',
        },
    }[permission]

    const Icon = config.icon

    return (
        <div
            className={cn(
                'flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-xs',
                config.className,
            )}
        >
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span>{config.text}</span>
        </div>
    )
}

import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
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
    Keyboard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
    const [manualCode, setManualCode] = useState('')
    const [showManualEntry, setShowManualEntry] = useState(false)
    const [ignoreUrlCode, setIgnoreUrlCode] = useState(false)
    const normalizedManual = manualCode.trim()
    const isManualCodeValid = normalizedManual.length === 8
    const activeCode =
        showManualEntry || ignoreUrlCode
            ? isManualCodeValid
                ? normalizedManual
                : null
            : urlCode || null

    const statusQuery = useClockInStatus()
    const clockInMutation = useClockIn()
    const clockOutMutation = useClockOut()

    const profileQuery = useMyStudentProfile()
    const scheduleQuery = useActiveSchedule()
    const shiftTemplatesQuery = useShiftTemplates()

    const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [isGeoError, setIsGeoError] = useState(false)
    const [locationPermission, setLocationPermission] = useState<
        'unknown' | 'granted' | 'prompt' | 'denied' | 'unavailable'
    >('unknown')

    // Probe location permission status (display only — no pre-fetch).
    // Safari doesn't support navigator.permissions for geolocation, so
    // on Safari the banner stays neutral ("will be requested when you clock in").
    useEffect(() => {
        if (!navigator.geolocation) {
            setLocationPermission('unavailable')
            return
        }
        if (!navigator.permissions) {
            // Safari — can't probe, stay neutral
            setLocationPermission('prompt')
            return
        }

        let permStatus: PermissionStatus | null = null
        const onChange = () => {
            if (permStatus) setLocationPermission(permStatus.state)
        }

        navigator.permissions
            .query({ name: 'geolocation' })
            .then((result) => {
                permStatus = result
                setLocationPermission(result.state)
                result.addEventListener('change', onChange)
            })
            .catch(() => setLocationPermission('prompt'))

        return () => {
            if (permStatus) permStatus.removeEventListener('change', onChange)
        }
    }, [])

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

    // Prevent double-tap: store the in-flight promise
    const locationPromiseRef = useRef<Promise<{
        lat: number
        lng: number
    }> | null>(null)

    const requestLocation = useCallback((): Promise<{
        lat: number
        lng: number
    }> => {
        // Return existing in-flight request if already running
        if (locationPromiseRef.current) return locationPromiseRef.current

        // Check secure context — geolocation requires HTTPS
        if (window.isSecureContext === false) {
            const message =
                'Location requires a secure (HTTPS) connection. Please contact an administrator.'
            setGeo({ status: 'denied', message })
            setLocationPermission('denied')
            return Promise.reject(new Error(message))
        }

        if (!navigator.geolocation) {
            const message =
                'Location services are not available in this browser. Please use a supported browser.'
            setGeo({ status: 'denied', message })
            setLocationPermission('unavailable')
            return Promise.reject(new Error(message))
        }

        setGeo({ status: 'requesting' })

        const promise = new Promise<{ lat: number; lng: number }>(
            (resolve, reject) => {
                let settled = false
                let attemptCount = 0

                // Safety timeout — if the browser never responds
                const safetyTimer = setTimeout(() => {
                    if (!settled) {
                        settled = true
                        const message =
                            'Location request timed out after 30 seconds. Please check your location settings and try again.'
                        setGeo({ status: 'denied', message })
                        setLocationPermission('denied')
                        reject(new Error(message))
                    }
                }, 30_000)

                const finish = (
                    result:
                        | { ok: true; lat: number; lng: number }
                        | { ok: false; message: string },
                ) => {
                    if (settled) return
                    settled = true
                    clearTimeout(safetyTimer)

                    if (result.ok) {
                        setGeo({
                            status: 'granted',
                            lat: result.lat,
                            lng: result.lng,
                        })
                        setLocationPermission('granted')
                        resolve({ lat: result.lat, lng: result.lng })
                    } else {
                        setGeo({ status: 'denied', message: result.message })
                        setLocationPermission('denied')
                        reject(new Error(result.message))
                    }
                }

                const onSuccess = (pos: GeolocationPosition) => {
                    const { latitude, longitude, accuracy } = pos.coords

                    // Validate coordinates
                    if (
                        !Number.isFinite(latitude) ||
                        !Number.isFinite(longitude) ||
                        (latitude === 0 && longitude === 0)
                    ) {
                        finish({
                            ok: false,
                            message:
                                'Received invalid location data. Please try again.',
                        })
                        return
                    }

                    // Reject extremely poor accuracy (>5km = likely IP-based, useless)
                    if (accuracy && accuracy > 5000) {
                        finish({
                            ok: false,
                            message:
                                'Location accuracy is too low. Please enable WiFi or move outdoors and try again.',
                        })
                        return
                    }

                    finish({ ok: true, lat: latitude, lng: longitude })
                }

                const getErrorMessage = (
                    err: GeolocationPositionError,
                ): string => {
                    if (err.code === 1) {
                        const ua = navigator.userAgent
                        if (/iPad|iPhone|iPod/.test(ua)) {
                            return 'Location blocked. Tap the "aA" icon in Safari\u2019s address bar \u203a Website Settings \u203a Location \u203a Allow. Then try again.'
                        }
                        if (/Android/.test(ua)) {
                            return 'Location blocked. Tap the lock icon next to the URL, then allow Location access.'
                        }
                        return 'Location blocked. Click the lock/tune icon in the address bar and allow location access for this site.'
                    }
                    if (err.code === 3) {
                        return 'Location request timed out. Please move to an area with better signal and try again.'
                    }
                    return 'Your location could not be determined. Please ensure Location Services are enabled and try again.'
                }

                const attempt = (highAccuracy: boolean, timeout: number) => {
                    attemptCount++
                    navigator.geolocation.getCurrentPosition(
                        onSuccess,
                        (err) => {
                            if (settled) return
                            // Permission denied — never retry
                            if (err.code === 1) {
                                finish({
                                    ok: false,
                                    message: getErrorMessage(err),
                                })
                                return
                            }
                            // Retry up to 3 attempts
                            if (attemptCount < 3) {
                                attempt(
                                    attemptCount === 2, // 3rd attempt uses high accuracy
                                    15_000,
                                )
                            } else {
                                finish({
                                    ok: false,
                                    message: getErrorMessage(err),
                                })
                            }
                        },
                        {
                            enableHighAccuracy: highAccuracy,
                            timeout,
                            maximumAge: 0, // always fresh position
                        },
                    )
                }

                // Start: low accuracy, 10s timeout
                attempt(false, 10_000)
            },
        )

        // Track in-flight promise, clear on settle
        locationPromiseRef.current = promise
        promise.finally(() => {
            locationPromiseRef.current = null
        })

        return promise
    }, [])

    const handleClockIn = useCallback(async () => {
        if (!activeCode) return
        setErrorMessage(null)
        setIsGeoError(false)

        let coords: { lat: number; lng: number }
        try {
            coords = await requestLocation()
        } catch (err) {
            playErrorTone()
            setIsGeoError(true)
            setErrorMessage(
                err instanceof Error
                    ? err.message
                    : 'Could not get your location. Please try again.',
            )
            return
        }

        clockInMutation.mutate(
            { code: activeCode!, longitude: coords.lng, latitude: coords.lat },
            {
                onSuccess: () => playClockInTone(),
                onError: (error) => {
                    playErrorTone()
                    setIsGeoError(false)
                    setErrorMessage(getApiErrorMessage(error))
                },
            },
        )
    }, [activeCode, requestLocation, clockInMutation])

    const handleResetCode = useCallback(() => {
        setManualCode('')
        setShowManualEntry(true)
        setIgnoreUrlCode(true)
        setErrorMessage(null)
        setIsGeoError(false)
    }, [])

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
                {!activeCode ? (
                    <>
                        {/* No code — scan prompt + manual entry */}
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

                        {/* Manual code entry toggle */}
                        {!showManualEntry ? (
                            <button
                                type="button"
                                onClick={() => setShowManualEntry(true)}
                                className="flex w-full items-center justify-center gap-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                            >
                                <Keyboard className="h-3.5 w-3.5" />
                                Enter code manually
                            </button>
                        ) : (
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Enter 8-character code"
                                        value={manualCode}
                                        onChange={(e) =>
                                            setManualCode(
                                                e.target.value
                                                    .toUpperCase()
                                                    .replace(/[^A-Z0-9]/g, '')
                                                    .slice(0, 8),
                                            )
                                        }
                                        className="font-mono text-center text-lg tracking-widest"
                                        maxLength={8}
                                        autoFocus
                                    />
                                </div>
                                <p className="text-center text-[11px] text-muted-foreground">
                                    Ask the admin for the code shown on the
                                    clock-in station
                                </p>
                            </div>
                        )}

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

                        {errorMessage && (
                            <>
                                <ErrorBanner
                                    message={errorMessage}
                                    onRetry={
                                        isGeoError ? handleClockIn : undefined
                                    }
                                />
                                {!isGeoError && (
                                    <button
                                        type="button"
                                        onClick={handleResetCode}
                                        className="flex w-full items-center justify-center gap-1.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                    >
                                        <Keyboard className="h-3.5 w-3.5" />
                                        Try a different code
                                    </button>
                                )}
                            </>
                        )}

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

function ErrorBanner({
    message,
    onRetry,
}: {
    message: string
    onRetry?: () => void
}) {
    return (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 space-y-2.5">
            <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <p className="text-sm text-red-600">{message}</p>
            </div>
            {onRetry && (
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={onRetry}
                >
                    <LocateFixed className="mr-1.5 h-3.5 w-3.5" />
                    Try again
                </Button>
            )}
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

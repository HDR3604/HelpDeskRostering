import { useState, useCallback, useEffect } from 'react'
import { useSearch } from '@tanstack/react-router'
import {
    Clock,
    LogIn,
    LogOut,
    MapPin,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    useClockInStatus,
    useClockIn,
    useClockOut,
} from '@/lib/queries/time-logs'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { playClockInTone, playClockOutTone, playErrorTone } from '@/lib/tones'

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
    if (mins < 1) return 'Less than a minute'
    const hrs = Math.floor(mins / 60)
    if (hrs > 0) return `${hrs}h ${mins % 60}m`
    return `${mins}m`
}

export function StudentClock() {
    useDocumentTitle('Clock In')

    const { code: urlCode } = useSearch({ from: '/_app/clock' })
    const statusQuery = useClockInStatus()
    const clockInMutation = useClockIn()
    const clockOutMutation = useClockOut()

    const [geo, setGeo] = useState<GeoState>({ status: 'idle' })
    const [elapsed, setElapsed] = useState('')

    const status = statusQuery.data
    const isClockedIn = status?.is_clocked_in ?? false

    // Tick elapsed time while clocked in
    useEffect(() => {
        if (!status?.current_log) return
        const update = () =>
            setElapsed(formatDuration(status.current_log!.entry_at))
        update()
        const id = setInterval(update, 30_000)
        return () => clearInterval(id)
    }, [status?.current_log])

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
                    setGeo({
                        status: 'granted',
                        ...coords,
                    })
                    resolve(coords)
                },
                (err) => {
                    const message =
                        err.code === err.PERMISSION_DENIED
                            ? 'Location access denied. Please enable location in your browser settings.'
                            : 'Could not determine your location. Please try again.'
                    setGeo({ status: 'denied', message })
                    reject(new Error(message))
                },
                { enableHighAccuracy: true, timeout: 10_000 },
            )
        })
    }, [])

    const handleClockIn = useCallback(async () => {
        const code = urlCode
        if (!code) {
            playErrorTone()
            return
        }

        try {
            const { lat, lng } = await requestLocation()
            clockInMutation.mutate(
                { code, longitude: lng, latitude: lat },
                {
                    onSuccess: () => playClockInTone(),
                    onError: () => playErrorTone(),
                },
            )
        } catch {
            playErrorTone()
        }
    }, [urlCode, requestLocation, clockInMutation])

    const handleClockOut = useCallback(() => {
        clockOutMutation.mutate(undefined, {
            onSuccess: () => playClockOutTone(),
            onError: () => playErrorTone(),
        })
    }, [clockOutMutation])

    const isActioning =
        clockInMutation.isPending ||
        clockOutMutation.isPending ||
        geo.status === 'requesting'

    return (
        <div className="mx-auto max-w-md space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Time Clock
                </h1>
                <p className="text-muted-foreground">
                    Clock in and out of your shifts
                </p>
            </div>

            {/* Current status card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Clock className="h-5 w-5" />
                                Status
                            </CardTitle>
                            <CardDescription>
                                {isClockedIn
                                    ? 'You are currently clocked in'
                                    : 'You are not clocked in'}
                            </CardDescription>
                        </div>
                        <Badge
                            variant="outline"
                            className={
                                isClockedIn
                                    ? 'gap-1.5 border-green-500/30 bg-green-500/10 text-green-600'
                                    : 'gap-1.5'
                            }
                        >
                            {isClockedIn ? (
                                <>
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                                    </span>
                                    On Shift
                                </>
                            ) : (
                                'Off Shift'
                            )}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {statusQuery.isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : isClockedIn && status?.current_log ? (
                        <>
                            {/* Shift info */}
                            {status.current_shift && (
                                <div className="rounded-lg border bg-muted/40 px-4 py-3">
                                    <p className="text-sm font-medium">
                                        {status.current_shift.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {status.current_shift.start_time}{' '}
                                        &ndash; {status.current_shift.end_time}
                                    </p>
                                </div>
                            )}

                            {/* Clock-in details */}
                            <div className="flex items-center gap-3 text-sm">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/15">
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                </div>
                                <div>
                                    <p className="font-medium">
                                        Clocked in at{' '}
                                        {formatTime(
                                            status.current_log.entry_at,
                                        )}
                                    </p>
                                    <p className="text-muted-foreground">
                                        {elapsed} elapsed
                                    </p>
                                </div>
                            </div>

                            {/* Clock-out button */}
                            <Button
                                onClick={handleClockOut}
                                disabled={isActioning}
                                variant="destructive"
                                size="lg"
                                className="w-full"
                            >
                                {clockOutMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LogOut className="mr-2 h-4 w-4" />
                                )}
                                Clock Out
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* No code warning */}
                            {!urlCode && (
                                <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                    <div className="text-sm">
                                        <p className="font-medium text-amber-700">
                                            No clock-in code
                                        </p>
                                        <p className="text-amber-600/80">
                                            Scan the QR code at the help desk to
                                            get a valid clock-in link.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Location status */}
                            {geo.status === 'denied' && (
                                <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                    <p className="text-sm text-red-600">
                                        {geo.message}
                                    </p>
                                </div>
                            )}

                            {/* Clock-in button */}
                            <Button
                                onClick={handleClockIn}
                                disabled={isActioning || !urlCode}
                                size="lg"
                                className="w-full"
                            >
                                {isActioning ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="mr-2 h-4 w-4" />
                                )}
                                {geo.status === 'requesting'
                                    ? 'Getting location...'
                                    : 'Clock In'}
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                <MapPin className="mr-1 inline h-3 w-3" />
                                Location access is required for clocking in
                            </p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

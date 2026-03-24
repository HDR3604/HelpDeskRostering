import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, Copy, Check, User, Timer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
    useActiveClockInCode,
    useGenerateClockInCode,
    useTodayTimeLogs,
} from '@/lib/queries/time-logs'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { AdminTimeLog } from '@/types/time-log'

const CODE_EXPIRY_MINUTES = 1

function formatTimeShort(iso: string): string {
    return new Date(iso).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function ClockInStation() {
    useDocumentTitle('Clock-In Station')

    const codeQuery = useActiveClockInCode()
    const generateCode = useGenerateClockInCode()
    const logsQuery = useTodayTimeLogs({ fastPoll: true })
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [copied, setCopied] = useState(false)

    const code = codeQuery.data
    const generateCodeRef = useRef(generateCode)
    generateCodeRef.current = generateCode

    // Derive countdown from backend's expires_at, auto-regenerate at 0
    useEffect(() => {
        if (!code?.expires_at) {
            if (codeQuery.isFetched && !generateCodeRef.current.isPending) {
                generateCodeRef.current.mutate(CODE_EXPIRY_MINUTES)
            }
            return
        }

        const tick = () => {
            const diff = new Date(code.expires_at).getTime() - Date.now()
            const remaining = Math.max(0, Math.ceil(diff / 1000))
            setSecondsLeft(remaining)

            if (remaining <= 0 && !generateCodeRef.current.isPending) {
                generateCodeRef.current.mutate(CODE_EXPIRY_MINUTES)
            }
        }
        tick()
        const id = setInterval(tick, 1000)
        return () => clearInterval(id)
    }, [code?.expires_at, codeQuery.isFetched])

    const clockUrl = code
        ? `${window.location.origin}/clock?code=${code.code}`
        : null

    const copyTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)
    useEffect(() => {
        return () => {
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
        }
    }, [])
    const handleCopy = useCallback(async () => {
        if (!clockUrl) return
        try {
            await navigator.clipboard.writeText(clockUrl)
            setCopied(true)
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard API unavailable
        }
    }, [clockUrl])

    // Activity feed
    const activeEntries = useMemo(() => {
        const logs = logsQuery.data?.data ?? []
        return logs
            .filter(
                (l): l is AdminTimeLog & { exit_at: null } =>
                    l.exit_at === null,
            )
            .sort(
                (a, b) =>
                    new Date(b.entry_at).getTime() -
                    new Date(a.entry_at).getTime(),
            )
    }, [logsQuery.data])

    const isLoading = codeQuery.isLoading || (!code && generateCode.isPending)

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Clock-In Station
                </h1>
                <p className="text-muted-foreground">
                    Display this QR code for students to scan and clock in.
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* QR Code — main area */}
                <div className="rounded-xl border bg-card">
                    {isLoading ? (
                        <div className="flex h-[480px] items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : clockUrl ? (
                        <div className="flex flex-col items-center gap-6 p-8">
                            {/* Timer ring */}
                            <div className="relative">
                                <svg
                                    className="h-[320px] w-[320px]"
                                    viewBox="0 0 340 340"
                                >
                                    <circle
                                        cx="170"
                                        cy="170"
                                        r="164"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        className="text-border"
                                    />
                                    <circle
                                        cx="170"
                                        cy="170"
                                        r="164"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        className="text-emerald-500 transition-all duration-1000 ease-linear"
                                        strokeDasharray={2 * Math.PI * 164}
                                        strokeDashoffset={
                                            2 *
                                            Math.PI *
                                            164 *
                                            (1 - secondsLeft / 60)
                                        }
                                        transform="rotate(-90 170 170)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="rounded-2xl bg-white p-4">
                                        <QRCodeSVG
                                            value={clockUrl}
                                            size={220}
                                            level="M"
                                            marginSize={0}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Code + actions */}
                            <div className="flex flex-col items-center gap-3 text-center">
                                <div className="flex items-center gap-3">
                                    <p className="font-mono text-3xl font-bold tracking-[0.3em]">
                                        {code!.code}
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Refreshes in{' '}
                                    <span className="tabular-nums font-medium text-foreground">
                                        {secondsLeft}s
                                    </span>
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-[480px] items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Live activity sidebar */}
                <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3">
                        <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold">
                                Live Activity
                            </h2>
                            {activeEntries.length > 0 && (
                                <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 text-[11px] px-1.5 py-0">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    </span>
                                    {activeEntries.length}
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Students currently on shift
                        </p>
                    </div>

                    <div className="max-h-[420px] overflow-y-auto p-2">
                        {activeEntries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Timer className="h-8 w-8 text-muted-foreground/30" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    No one on shift
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground/60">
                                    Students will appear here when they clock in
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {activeEntries.map((entry) => (
                                    <ActivityRow key={entry.id} entry={entry} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ActivityRow({ entry }: { entry: AdminTimeLog }) {
    const [elapsed, setElapsed] = useState('')

    useEffect(() => {
        const update = () => {
            const diff = Date.now() - new Date(entry.entry_at).getTime()
            const mins = Math.floor(diff / 60_000)
            if (mins < 1) {
                setElapsed('<1m')
                return
            }
            const hrs = Math.floor(mins / 60)
            setElapsed(hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`)
        }
        update()
        const id = setInterval(update, 30_000)
        return () => clearInterval(id)
    }, [entry.entry_at])

    return (
        <div
            className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5',
                entry.is_flagged
                    ? 'bg-red-500/10 ring-1 ring-red-500/20'
                    : 'bg-muted/40',
            )}
        >
            <div
                className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    entry.is_flagged
                        ? 'bg-red-500/20 text-red-500'
                        : 'bg-emerald-500/15 text-emerald-500',
                )}
            >
                <User className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                    {entry.student_name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                    {formatTimeShort(entry.entry_at)}
                </p>
            </div>
            <span
                className={cn(
                    'shrink-0 text-[11px] tabular-nums',
                    entry.is_flagged
                        ? 'text-red-500'
                        : 'font-medium text-emerald-500',
                )}
            >
                {elapsed}
            </span>
        </div>
    )
}

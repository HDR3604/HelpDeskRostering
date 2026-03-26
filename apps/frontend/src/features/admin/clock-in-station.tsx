import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from '@tanstack/react-router'
import { QRCodeSVG } from 'qrcode.react'
import {
    RefreshCw,
    Copy,
    Check,
    Timer,
    AlertTriangle,
    ChevronRight,
} from 'lucide-react'
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

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
}

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
    const totalSeconds = CODE_EXPIRY_MINUTES * 60
    useEffect(() => {
        if (!code?.expires_at) {
            if (codeQuery.isFetched && !generateCodeRef.current.isPending) {
                generateCodeRef.current.mutate(CODE_EXPIRY_MINUTES)
            }
            return
        }

        const diff = new Date(code.expires_at).getTime() - Date.now()
        const remaining = Math.ceil(diff / 1000)

        // If the code was generated with a different (longer) expiry,
        // immediately replace it with one matching our configured TTL.
        if (remaining > totalSeconds + 5) {
            if (!generateCodeRef.current.isPending) {
                generateCodeRef.current.mutate(CODE_EXPIRY_MINUTES)
            }
            return
        }

        const tick = () => {
            const d = new Date(code.expires_at).getTime() - Date.now()
            const r = Math.max(0, Math.ceil(d / 1000))
            setSecondsLeft(r)

            if (r <= 0 && !generateCodeRef.current.isPending) {
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
            await navigator.clipboard.writeText(code?.code ?? '')
            setCopied(true)
            if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
            copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000)
        } catch {
            // Clipboard API unavailable
        }
    }, [clockUrl])

    // Activity feed — only currently clocked-in students
    const activeEntries = useMemo(() => {
        const logs = logsQuery.data?.data ?? []
        return logs
            .filter((l) => l.exit_at === null)
            .sort(
                (a, b) =>
                    new Date(b.entry_at).getTime() -
                    new Date(a.entry_at).getTime(),
            )
    }, [logsQuery.data])

    const activeCount = activeEntries.length
    const flaggedCount = activeEntries.filter((l) => l.is_flagged).length

    const isLoading = codeQuery.isLoading || (!code && generateCode.isPending)

    // Timer progress (0 to 1)
    const progress = totalSeconds > 0 ? secondsLeft / totalSeconds : 0

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Clock-In Station
                    </h1>
                    <p className="text-muted-foreground">
                        Display this QR code for students to scan and clock in.
                    </p>
                </div>
                {/* Summary stats */}
                <div className="hidden items-center gap-3 sm:flex">
                    {activeCount > 0 && (
                        <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            {activeCount} active
                        </Badge>
                    )}
                    {flaggedCount > 0 && (
                        <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15">
                            {flaggedCount} flagged
                        </Badge>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                {/* QR Code — main area */}
                <div className="rounded-2xl border bg-card">
                    {isLoading ? (
                        <div className="flex h-[520px] items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : clockUrl ? (
                        <div className="flex flex-col items-center gap-8 p-8 sm:p-10">
                            {/* Timer ring + QR */}
                            <div className="relative">
                                <svg
                                    className="h-[300px] w-[300px] sm:h-[340px] sm:w-[340px]"
                                    viewBox="0 0 360 360"
                                >
                                    {/* Track */}
                                    <circle
                                        cx="180"
                                        cy="180"
                                        r="174"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        className="text-border"
                                    />
                                    {/* Progress */}
                                    <circle
                                        cx="180"
                                        cy="180"
                                        r="174"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        className={cn(
                                            'transition-all duration-1000 ease-linear',
                                            progress > 0.25
                                                ? 'text-emerald-500'
                                                : progress > 0.1
                                                  ? 'text-amber-500'
                                                  : 'text-red-500',
                                        )}
                                        strokeDasharray={2 * Math.PI * 174}
                                        strokeDashoffset={
                                            2 * Math.PI * 174 * (1 - progress)
                                        }
                                        transform="rotate(-90 180 180)"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">
                                        <QRCodeSVG
                                            value={clockUrl}
                                            size={210}
                                            level="M"
                                            marginSize={0}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Code display */}
                            <div className="flex flex-col items-center gap-2 text-center">
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-2xl font-bold tracking-[0.25em] sm:text-3xl">
                                        {code!.code}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 shrink-0"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <Copy className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </Button>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span>New code in</span>
                                    <span
                                        className={cn(
                                            'tabular-nums font-semibold',
                                            progress > 0.25
                                                ? 'text-foreground'
                                                : progress > 0.1
                                                  ? 'text-amber-500'
                                                  : 'text-red-500',
                                        )}
                                    >
                                        {secondsLeft}s
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-[520px] items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>

                {/* Live activity sidebar */}
                <div className="flex flex-col rounded-2xl border bg-card">
                    {/* Header */}
                    <div className="shrink-0 px-4 py-3.5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Activity</h2>
                            <div className="flex items-center gap-1.5">
                                {flaggedCount > 0 && (
                                    <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15 text-[10px] px-1.5 py-0">
                                        {flaggedCount}
                                    </Badge>
                                )}
                                {activeCount > 0 && (
                                    <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 text-[10px] px-1.5 py-0">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        </span>
                                        {activeCount} on shift
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Entries */}
                    <div className="flex-1 overflow-y-auto">
                        {activeEntries.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                                <Timer className="h-8 w-8 text-muted-foreground/20" />
                                <p className="mt-3 text-sm text-muted-foreground">
                                    No one on shift
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground/60">
                                    Students will appear here when they clock in
                                </p>
                            </div>
                        ) : (
                            <div>
                                {activeEntries.map((entry, i) => (
                                    <ActivityRow
                                        key={entry.id}
                                        entry={entry}
                                        isLast={i === activeEntries.length - 1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function ActivityRow({
    entry,
    isLast,
}: {
    entry: AdminTimeLog
    isLast?: boolean
}) {
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
        <Link
            to="/assistants/time-logs"
            search={{ log_id: entry.id }}
            className={cn(
                'group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-muted/50 no-underline',
                !isLast && 'border-b',
                entry.is_flagged && 'bg-red-500/5 hover:bg-red-500/10',
            )}
        >
            <div
                className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
                    entry.is_flagged
                        ? 'bg-red-500/15 text-red-500'
                        : 'bg-emerald-500/10 text-emerald-600',
                )}
            >
                {entry.is_flagged ? (
                    <AlertTriangle className="h-3 w-3" />
                ) : (
                    getInitials(entry.student_name)
                )}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">
                    {entry.student_name}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                    {formatTimeShort(entry.entry_at)}
                </p>
            </div>
            <span
                className={cn(
                    'shrink-0 text-[11px] tabular-nums font-medium',
                    entry.is_flagged ? 'text-red-500' : 'text-emerald-500',
                )}
            >
                {elapsed}
            </span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
        </Link>
    )
}

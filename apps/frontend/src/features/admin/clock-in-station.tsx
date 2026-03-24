import { useState, useEffect, useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { RefreshCw, Clock, QrCode, Copy, Check } from 'lucide-react'
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
    useActiveClockInCode,
    useGenerateClockInCode,
} from '@/lib/queries/time-logs'
import { useDocumentTitle } from '@/hooks/use-document-title'

const CODE_EXPIRY_MINUTES = 1

export function ClockInStation() {
    useDocumentTitle('Clock-In Station')

    const codeQuery = useActiveClockInCode()
    const generateCode = useGenerateClockInCode()
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [copied, setCopied] = useState(false)

    const code = codeQuery.data
    const generateCodeRef = useRef(generateCode)
    generateCodeRef.current = generateCode

    // Derive countdown from the backend's expires_at, auto-regenerate at 0
    useEffect(() => {
        if (!code?.expires_at) {
            // No code yet — generate one on first fetch
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

    const isLoading = codeQuery.isLoading || (!code && generateCode.isPending)

    return (
        <div className="mx-auto max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">
                    Clock-In Station
                </h1>
                <p className="text-muted-foreground">
                    Display this QR code for students to scan and clock in to
                    their shifts.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <QrCode className="h-5 w-5" />
                                QR Code
                            </CardTitle>
                            <CardDescription>
                                Students scan this to open their clock-in page
                            </CardDescription>
                        </div>
                        {code && (
                            <Badge
                                variant="outline"
                                className="gap-1.5 text-emerald-600"
                            >
                                <Clock className="h-3 w-3" />
                                {secondsLeft}s
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : clockUrl ? (
                        <div className="flex flex-col items-center gap-6">
                            <div className="rounded-xl border bg-white p-6">
                                <QRCodeSVG
                                    value={clockUrl}
                                    size={280}
                                    level="M"
                                    includeMargin={false}
                                />
                            </div>
                            <div className="flex flex-col items-center gap-2 text-center">
                                <p className="font-mono text-3xl font-bold tracking-[0.3em]">
                                    {code!.code}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Or enter this code manually
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="mr-1.5 h-3.5 w-3.5" />
                                    ) : (
                                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                                    )}
                                    {copied ? 'Copied' : 'Copy link'}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Code refreshes automatically every 30 seconds
                            </p>
                        </div>
                    ) : (
                        <div className="flex h-64 items-center justify-center">
                            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

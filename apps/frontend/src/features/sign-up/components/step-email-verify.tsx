import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowLeft, ArrowRight, Mail, CheckCircle2, RefreshCw, Loader2 } from 'lucide-react'

const RESEND_COOLDOWN_SECONDS = 30

interface StepEmailVerifyProps {
    email: string
    isVerified: boolean
    isSending: boolean
    onResend: () => void
    onBack: () => void
    onNext: () => void
}

export function StepEmailVerify({
    email,
    isVerified,
    isSending,
    onResend,
    onBack,
    onNext,
}: StepEmailVerifyProps) {
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

    // Start cooldown on mount (email was just sent) and reset on resend
    const startCooldown = useCallback(() => {
        setCooldown(RESEND_COOLDOWN_SECONDS)
    }, [])

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setInterval(() => {
            setCooldown((prev) => prev - 1)
        }, 1_000)
        return () => clearInterval(timer)
    }, [cooldown])

    function handleResend() {
        onResend()
        startCooldown()
    }

    return (
        <div className="space-y-6">
            {/* Status card */}
            <div className="flex flex-col items-center gap-5 rounded-lg border bg-card px-6 py-10 text-center">
                <div className="rounded-full bg-primary/10 p-3">
                    {isVerified ? (
                        <CheckCircle2 className="size-8 text-primary" />
                    ) : (
                        <Mail className="size-8 text-primary" />
                    )}
                </div>

                {isVerified ? (
                    <div className="space-y-1.5">
                        <p className="text-base font-semibold">Email verified</p>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{email}</span>{' '}
                            has been verified. You can continue.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        <p className="text-base font-semibold">Check your inbox</p>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            We sent a verification link to{' '}
                            <span className="font-medium text-foreground">{email}</span>.
                            Click the link in the email to continue.
                        </p>
                    </div>
                )}

                {!isVerified && (
                    <div className="flex flex-col items-center gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isSending || cooldown > 0}
                            onClick={handleResend}
                        >
                            {isSending ? (
                                <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="size-3.5" />
                            )}
                            {cooldown > 0
                                ? `Resend in ${cooldown}s`
                                : 'Resend email'}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                            Didn&apos;t receive it? Check your spam folder.
                        </p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <div className="flex-1" />
                <Button
                    type="button"
                    disabled={!isVerified}
                    onClick={onNext}
                >
                    Continue
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    )
}

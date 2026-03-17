import { useState, useEffect, useCallback } from 'react'
import { FormError } from '@/components/ui/form-error'
import { Button } from '@/components/ui/button'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator,
} from '@/components/ui/input-otp'
import {
    ArrowLeft,
    ArrowRight,
    Mail,
    CheckCircle2,
    RefreshCw,
    Loader2,
} from 'lucide-react'

const RESEND_COOLDOWN_SECONDS = 30
const CODE_LENGTH = 6

interface StepEmailVerifyProps {
    email: string
    isVerified: boolean
    isSending: boolean
    isVerifying: boolean
    error: string | null
    onVerify: (code: string) => void
    onResend: () => void
    onBack: () => void
    onNext: () => void
}

export function StepEmailVerify({
    email,
    isVerified,
    isSending,
    isVerifying,
    error,
    onVerify,
    onResend,
    onBack,
    onNext,
}: StepEmailVerifyProps) {
    const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)
    const [code, setCode] = useState('')

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
        setCode('')
        startCooldown()
    }

    function handleCodeChange(value: string) {
        setCode(value)
        if (value.length === CODE_LENGTH) {
            onVerify(value)
        }
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
                        <p className="text-base font-semibold">
                            Email verified
                        </p>
                        <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">
                                {email}
                            </span>{' '}
                            has been verified. You can continue.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-1.5">
                            <p className="text-base font-semibold">
                                Enter verification code
                            </p>
                            <p className="text-sm text-muted-foreground max-w-sm">
                                We sent a 6-digit code to{' '}
                                <span className="font-medium text-foreground">
                                    {email}
                                </span>
                                . Enter it below to verify your email.
                            </p>
                        </div>

                        <div className="flex flex-col items-center gap-3">
                            <InputOTP
                                maxLength={CODE_LENGTH}
                                value={code}
                                onChange={handleCodeChange}
                                disabled={isVerifying}
                                autoFocus
                            >
                                <InputOTPGroup>
                                    <InputOTPSlot index={0} />
                                    <InputOTPSlot index={1} />
                                    <InputOTPSlot index={2} />
                                </InputOTPGroup>
                                <InputOTPSeparator />
                                <InputOTPGroup>
                                    <InputOTPSlot index={3} />
                                    <InputOTPSlot index={4} />
                                    <InputOTPSlot index={5} />
                                </InputOTPGroup>
                            </InputOTP>
                            {isVerifying && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Loader2 className="size-3.5 animate-spin" />
                                    Verifying...
                                </div>
                            )}
                            {error && <FormError message={error} />}
                        </div>

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
                                    : 'Resend code'}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Didn&apos;t receive it? Check your spam folder.
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onBack}>
                    <ArrowLeft className="size-4" />
                    Back
                </Button>
                <div className="flex-1" />
                <Button type="button" disabled={!isVerified} onClick={onNext}>
                    Continue
                    <ArrowRight className="size-4" />
                </Button>
            </div>
        </div>
    )
}

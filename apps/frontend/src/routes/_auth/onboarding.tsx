import * as React from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { friendlyError, getApiErrorMessage } from '@/lib/error-messages'
import {
    AlertCircle,
    GraduationCap,
    Loader2,
    ShieldX,
    TimerOff,
} from 'lucide-react'

import { isAuthenticated } from '@/lib/auth'
import { ErrorState } from '@/components/layout/error-state'
import { StepSetPassword } from '@/features/onboarding/components/step-set-password'
import {
    BankingDetailsForm,
    type BankingDetailsValues,
} from '@/features/student/components/banking-details-form'
import type { PasswordData } from '@/features/onboarding/lib/onboarding-schemas'
import { completeOnboarding, validateOnboardingToken } from '@/lib/auth/actions'
import {
    upsertMyBankingDetails,
    getCurrentConsent,
    type ConsentResponse,
} from '@/lib/api/students'

const searchSchema = z.object({
    token: z.string().catch(''),
})

export const Route = createFileRoute('/_auth/onboarding')({
    validateSearch: searchSchema,
    beforeLoad: () => {
        if (isAuthenticated()) {
            throw redirect({ to: '/' })
        }
    },
    component: OnboardingPage,
})

const STEPS = [
    {
        title: 'Set your password',
        description: 'Create a secure password for your account.',
    },
    {
        title: 'Banking details',
        description: 'We need this to process your salary payments.',
    },
] as const

function resolveTokenError(msg: string): {
    icon: React.ReactNode
    title: string
    description: string
} | null {
    switch (msg) {
        case 'invalid onboarding token':
            return {
                icon: <ShieldX />,
                title: 'Invalid onboarding link',
                description:
                    'This onboarding link is not valid. Please check your email for the correct link or contact an administrator.',
            }
        case 'onboarding token has expired':
            return {
                icon: <TimerOff />,
                title: 'Link expired',
                description:
                    'This onboarding link has expired. Please contact an administrator to get a new one.',
            }
        case 'onboarding token has already been used':
            return {
                icon: <AlertCircle />,
                title: 'Already completed',
                description:
                    'This onboarding link has already been used. You can sign in with the password you set during onboarding.',
            }
        default:
            return null
    }
}

function OnboardingPage() {
    const { token } = Route.useSearch()
    const navigate = useNavigate()

    const [step, setStep] = React.useState(0)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [error, setError] = React.useState('')
    const [isValidating, setIsValidating] = React.useState(true)
    const [consent, setConsent] = React.useState<ConsentResponse | null>(null)
    const [consentLoading, setConsentLoading] = React.useState(false)
    const [consentError, setConsentError] = React.useState('')
    const [tokenError, setTokenError] = React.useState<{
        icon: React.ReactNode
        title: string
        description: string
    } | null>(null)

    React.useEffect(() => {
        if (!token) {
            setIsValidating(false)
            return
        }

        let cancelled = false
        ;(async () => {
            try {
                await validateOnboardingToken(token)
            } catch (error) {
                if (cancelled) return
                if (isAxiosError(error) && error.response?.data?.error) {
                    const resolved = resolveTokenError(
                        error.response.data.error,
                    )
                    setTokenError(
                        resolved ?? {
                            icon: <AlertCircle />,
                            title: 'Something went wrong',
                            description:
                                'We could not validate your onboarding link. Please try again later.',
                        },
                    )
                } else {
                    setTokenError({
                        icon: <AlertCircle />,
                        title: 'Something went wrong',
                        description:
                            'We could not validate your onboarding link. Please try again later.',
                    })
                }
            } finally {
                if (!cancelled) setIsValidating(false)
            }
        })()

        return () => {
            cancelled = true
        }
    }, [token])

    // Fetch consent text when moving to banking step
    React.useEffect(() => {
        if (step !== 1 || consent) return
        let cancelled = false
        setConsentLoading(true)
        setConsentError('')
        ;(async () => {
            try {
                const data = await getCurrentConsent()
                if (!cancelled) setConsent(data)
            } catch {
                if (!cancelled)
                    setConsentError(
                        'Could not load consent information. Please try again.',
                    )
            } finally {
                if (!cancelled) setConsentLoading(false)
            }
        })()
        return () => {
            cancelled = true
        }
    }, [step, consent])

    if (!token || tokenError) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <ErrorState
                    icon={tokenError?.icon ?? <AlertCircle />}
                    title={tokenError?.title ?? 'Invalid onboarding link'}
                    description={
                        tokenError?.description ??
                        'This link is missing a valid token. Please check your email for the correct onboarding link.'
                    }
                />
            </div>
        )
    }

    if (isValidating) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
        )
    }

    async function handlePasswordSubmit(data: PasswordData) {
        setIsSubmitting(true)
        setError('')
        try {
            await completeOnboarding(token, data.password)
            setStep(1)
        } catch (err) {
            if (isAxiosError(err) && err.response?.data?.error) {
                const msg = err.response.data.error as string
                const resolved = resolveTokenError(msg)
                if (resolved) {
                    setTokenError(resolved)
                } else {
                    setError(friendlyError(msg))
                }
            } else {
                setError('Something went wrong. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleBankingSubmit(values: BankingDetailsValues) {
        try {
            await upsertMyBankingDetails({
                bank_name: values.bankName,
                branch_name: values.branchName,
                account_type: values.accountType,
                account_number: values.accountNumber,
            })
            toast.success('Onboarding complete! Welcome aboard.')
            navigate({ to: '/' })
        } catch (err) {
            toast.error(
                getApiErrorMessage(
                    err,
                    'Failed to save banking details. Please try again.',
                ),
            )
        }
    }

    const currentStep = STEPS[step]

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
            <div className="space-y-6 sm:space-y-8">
                {/* Logo + title */}
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <GraduationCap className="size-5" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-semibold">HelpDesk</span>
                        <span className="text-xs text-muted-foreground">
                            Rostering
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-3">
                    <div className="flex gap-1.5">
                        {STEPS.map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 flex-1 rounded-full transition-colors ${
                                    i <= step ? 'bg-primary' : 'bg-muted'
                                }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                        Step {step + 1} of {STEPS.length}
                    </p>
                </div>

                {/* Step heading */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        {currentStep.title}
                    </h1>
                    <p className="text-muted-foreground">
                        {currentStep.description}
                    </p>
                </div>

                {/* Step content */}
                {step === 0 && (
                    <StepSetPassword
                        onNext={handlePasswordSubmit}
                        isSubmitting={isSubmitting}
                        error={error}
                    />
                )}
                {step === 1 && (
                    <BankingDetailsForm
                        embedded
                        onSubmit={handleBankingSubmit}
                        submitLabel="Complete Onboarding"
                        consent={consent ?? undefined}
                        consentLoading={consentLoading}
                        consentError={consentError}
                    />
                )}
            </div>
        </div>
    )
}

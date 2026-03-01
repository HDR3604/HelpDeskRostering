import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { AlertCircle, GraduationCap } from 'lucide-react'

import { ErrorState } from '@/components/layout/error-state'
import { StepSetPassword } from '@/features/onboarding/components/step-set-password'
import type { PasswordData } from '@/features/onboarding/lib/onboarding-schemas'
import { completeOnboarding } from '@/lib/auth/actions'

const searchSchema = z.object({
    token: z.string().catch(''),
})

export const Route = createFileRoute('/_auth/onboarding')({
    validateSearch: searchSchema,
    component: OnboardingPage,
})

function OnboardingPage() {
    const { token } = Route.useSearch()
    const navigate = useNavigate()
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    if (!token) {
        return (
            <div className="flex min-h-screen items-center justify-center px-4">
                <ErrorState
                    icon={<AlertCircle />}
                    title="Invalid onboarding link"
                    description="This link is missing a valid token. Please check your email for the correct onboarding link."
                />
            </div>
        )
    }

    async function handlePasswordSubmit(data: PasswordData) {
        setIsSubmitting(true)
        try {
            await completeOnboarding(token, data.password)
            toast.success('Onboarding complete! Welcome aboard.')
            navigate({ to: '/' })
        } catch (error) {
            if (isAxiosError(error) && error.response?.data?.error) {
                toast.error(error.response.data.error)
            } else {
                toast.error('Something went wrong. Please try again.')
            }
        } finally {
            setIsSubmitting(false)
        }
    }

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

                {/* Step heading */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Set your password
                    </h1>
                    <p className="text-muted-foreground">
                        Create a secure password for your account.
                    </p>
                </div>

                {/* Password form */}
                <StepSetPassword
                    onNext={handlePasswordSubmit}
                    isSubmitting={isSubmitting}
                />
            </div>
        </div>
    )
}

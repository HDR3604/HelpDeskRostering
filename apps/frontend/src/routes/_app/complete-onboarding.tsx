import * as React from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { GraduationCap } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/error-messages'
import { useDocumentTitle } from '@/hooks/use-document-title'
import {
    BankingDetailsForm,
    type BankingDetailsValues,
} from '@/features/student/components/banking-details-form'
import {
    upsertMyBankingDetails,
    getCurrentConsent,
    type ConsentResponse,
} from '@/lib/api/students'

export const Route = createFileRoute('/_app/complete-onboarding')({
    component: CompleteOnboardingPage,
})

function CompleteOnboardingPage() {
    useDocumentTitle('Complete Onboarding')
    const navigate = useNavigate()

    const [consent, setConsent] = React.useState<ConsentResponse | null>(null)
    const [consentLoading, setConsentLoading] = React.useState(true)
    const [consentError, setConsentError] = React.useState('')

    React.useEffect(() => {
        let cancelled = false
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
    }, [])

    async function handleSubmit(values: BankingDetailsValues) {
        try {
            await upsertMyBankingDetails({
                bank_name: values.bankName,
                branch_name: values.branchName,
                account_type: values.accountType,
                account_number: values.accountNumber,
            })
            toast.success('Onboarding complete! Welcome aboard.')
            navigate({ to: '/', replace: true })
        } catch (err) {
            toast.error(
                getApiErrorMessage(
                    err,
                    'Failed to save banking details. Please try again.',
                ),
            )
        }
    }

    return (
        <div className="mx-auto w-full max-w-2xl py-10 sm:py-16">
            <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <GraduationCap className="size-5" />
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-lg font-semibold">
                            Complete Your Onboarding
                        </span>
                        <span className="text-xs text-muted-foreground">
                            One more step before you can get started.
                        </span>
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        Banking details
                    </h1>
                    <p className="text-muted-foreground">
                        We need this to process your salary payments.
                    </p>
                </div>

                <BankingDetailsForm
                    embedded
                    onSubmit={handleSubmit}
                    submitLabel="Complete Onboarding"
                    consent={consent ?? undefined}
                    consentLoading={consentLoading}
                    consentError={consentError}
                />
            </div>
        </div>
    )
}

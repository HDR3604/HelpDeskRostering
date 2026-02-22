import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { simulateTranscriptExtraction } from '@/features/sign-up/lib/mock-transcript'
import {
    mockSendVerificationEmail,
    mockCheckVerificationStatus,
} from '@/features/sign-up/lib/mock-verification'
import type {
    VerifyData,
    ContactData,
} from '@/features/sign-up/lib/sign-up-schemas'
import { StepTranscriptUpload } from '@/features/sign-up/components/step-transcript-upload'
import { StepVerifyDetails } from '@/features/sign-up/components/step-verify-details'
import { StepContactInfo } from '@/features/sign-up/components/step-contact-info'
import { StepEmailVerify } from '@/features/sign-up/components/step-email-verify'
import { StepAvailability } from '@/features/sign-up/components/step-availability'
import { StepReview } from '@/features/sign-up/components/step-review'
import { SubmissionSuccess } from '@/features/sign-up/components/submission-success'

export const Route = createFileRoute('/_auth/sign-up')({
    component: SignUpPage,
})

const STEPS = [
    {
        title: 'Upload your transcript',
        description: "We'll extract your academic details automatically.",
    },
    {
        title: 'Verify your details',
        description: 'Confirm the information extracted from your transcript.',
    },
    {
        title: 'How can we reach you?',
        description: 'Your email and phone number for notifications.',
    },
    {
        title: 'Verify your email',
        description: 'Confirm your email address to continue.',
    },
    {
        title: 'When are you available?',
        description: 'Select the times you can work at the help desk.',
    },
    {
        title: 'Review your application',
        description: 'Make sure everything looks good before submitting.',
    },
]

function SignUpPage() {
    useDocumentTitle('Apply')

    const [step, setStep] = useState(0)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Collected data
    const [transcript, setTranscript] = useState<File | null>(null)
    const [verifyData, setVerifyData] = useState<VerifyData | null>(null)
    const [contactData, setContactData] = useState<ContactData | null>(null)
    const [isEmailVerified, setIsEmailVerified] = useState(false)
    const [isSendingVerification, setIsSendingVerification] = useState(false)
    const [availability, setAvailability] = useState<Record<string, number[]> | null>(null)

    const currentStep = STEPS[step]
    const showChrome = step < STEPS.length

    // ── Step handlers ────────────────────────────────────────────────────────

    async function handleTranscriptNext(file: File) {
        setTranscript(file)
        setIsProcessing(true)
        try {
            const extracted = await simulateTranscriptExtraction(file)
            if (!verifyData) {
                setVerifyData(extracted)
            }
            setStep(1)
        } catch {
            toast.error('Failed to process transcript. Please try again.')
        } finally {
            setIsProcessing(false)
        }
    }

    function handleVerifyNext(data: VerifyData) {
        setVerifyData(data)
        setStep(2)
    }

    async function handleContactNext(data: ContactData) {
        setContactData(data)
        setIsSendingVerification(true)
        try {
            await mockSendVerificationEmail(data.email)
        } catch {
            toast.error('Failed to send verification email. Please try again.')
        } finally {
            setIsSendingVerification(false)
        }
        setStep(3)
    }

    async function handleResendVerification() {
        if (!contactData) return
        setIsSendingVerification(true)
        try {
            await mockSendVerificationEmail(contactData.email)
            toast.success('Verification email resent.')
        } catch {
            toast.error('Failed to resend. Please try again.')
        } finally {
            setIsSendingVerification(false)
        }
    }

    // Poll for email verification while on the verify step
    useEffect(() => {
        if (step !== 3 || isEmailVerified || !contactData) return
        const interval = setInterval(async () => {
            const verified = await mockCheckVerificationStatus(contactData.email)
            if (verified) setIsEmailVerified(true)
        }, 2_000)
        return () => clearInterval(interval)
    }, [step, isEmailVerified, contactData])

    function handleAvailabilityNext(avail: Record<string, number[]>) {
        setAvailability(avail)
        setStep(5)
    }

    async function handleSubmit() {
        if (!transcript || !verifyData || !contactData || !availability) return

        setIsSubmitting(true)
        try {
            await new Promise((resolve) => setTimeout(resolve, 2000))

            const payload = {
                student_id: parseInt(verifyData.studentId),
                email_address: contactData.email,
                first_name: verifyData.firstName,
                last_name: verifyData.lastName,
                phone_number: contactData.phoneNumber,
                transcript_metadata: {
                    overall_gpa: verifyData.overallGpa,
                    degree_gpa: verifyData.degreeGpa,
                    degree_programme: verifyData.degreeProgramme,
                    courses: verifyData.courses.map((c) => ({
                        [c.courseCode]: c.grade,
                    })),
                    current_level: verifyData.currentYear,
                },
                availability,
            }
            console.log('Submission payload:', JSON.stringify(payload, null, 2))
            setStep(6)
        } catch {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
            <div className="space-y-6 sm:space-y-8">
                {showChrome && (
                    <>
                        {/* Branded header */}
                        <div className="flex items-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <GraduationCap className="size-5" />
                            </div>
                            <div className="flex flex-col leading-none">
                                <span className="text-lg font-semibold">HelpDesk</span>
                                <span className="text-xs text-muted-foreground">Rostering</span>
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
                    </>
                )}

                {/* Step content */}
                {step === 0 && (
                    <StepTranscriptUpload
                        defaultValue={transcript ?? undefined}
                        onNext={handleTranscriptNext}
                        isProcessing={isProcessing}
                    />
                )}

                {step === 1 && verifyData && (
                    <StepVerifyDetails
                        defaultValues={verifyData}
                        onNext={handleVerifyNext}
                        onBack={() => setStep(0)}
                    />
                )}

                {step === 2 && (
                    <StepContactInfo
                        defaultValues={contactData ?? undefined}
                        onNext={handleContactNext}
                        onBack={() => setStep(1)}
                    />
                )}

                {step === 3 && contactData && (
                    <StepEmailVerify
                        email={contactData.email}
                        isVerified={isEmailVerified}
                        isSending={isSendingVerification}
                        onResend={handleResendVerification}
                        onBack={() => setStep(2)}
                        onNext={() => setStep(4)}
                    />
                )}

                {step === 4 && (
                    <StepAvailability
                        defaultValues={availability ?? undefined}
                        onNext={handleAvailabilityNext}
                        onBack={() => setStep(3)}
                    />
                )}

                {step === 5 && verifyData && contactData && availability && transcript && (
                    <StepReview
                        verify={verifyData}
                        contact={contactData}
                        availability={availability}
                        transcriptName={transcript.name}
                        onGoToStep={setStep}
                        onBack={() => setStep(4)}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                )}

                {step === 6 && <SubmissionSuccess />}
            </div>
        </div>
    )
}

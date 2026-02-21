import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { simulateTranscriptExtraction } from '@/features/sign-up/lib/mock-transcript'
import type {
    VerifyData,
    ContactData,
} from '@/features/sign-up/lib/sign-up-schemas'
import { StepTranscriptUpload } from '@/features/sign-up/components/step-transcript-upload'
import { StepVerifyDetails } from '@/features/sign-up/components/step-verify-details'
import { StepContactInfo } from '@/features/sign-up/components/step-contact-info'
import { StepAvailability } from '@/features/sign-up/components/step-availability'
import { StepReview } from '@/features/sign-up/components/step-review'
import { SubmissionSuccess } from '@/features/sign-up/components/submission-success'
import { ViewApplication } from '@/features/sign-up/components/view-application'

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

    function handleContactNext(data: ContactData) {
        setContactData(data)
        setStep(3)
    }

    function handleAvailabilityNext(avail: Record<string, number[]>) {
        setAvailability(avail)
        setStep(4)
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
            setStep(5)
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

                {step === 3 && (
                    <StepAvailability
                        defaultValues={availability ?? undefined}
                        onNext={handleAvailabilityNext}
                        onBack={() => setStep(2)}
                    />
                )}

                {step === 4 && verifyData && contactData && availability && transcript && (
                    <StepReview
                        verify={verifyData}
                        contact={contactData}
                        availability={availability}
                        transcriptName={transcript.name}
                        onGoToStep={setStep}
                        onBack={() => setStep(3)}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                )}

                {step === 5 && (
                    <SubmissionSuccess onViewApplication={() => setStep(6)} />
                )}

                {step === 6 && verifyData && contactData && availability && transcript && (
                    <ViewApplication
                        verify={verifyData}
                        contact={contactData}
                        availability={availability}
                        transcriptName={transcript.name}
                    />
                )}
            </div>
        </div>
    )
}

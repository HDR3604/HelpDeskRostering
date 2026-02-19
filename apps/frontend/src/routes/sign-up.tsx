import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { StepIndicator } from '@/components/sign-up/StepIndicator'
import { Step1StudentInfo } from '@/components/sign-up/Step1StudentInfo'
import { Step2TranscriptVerify } from '@/components/sign-up/Step2TranscriptVerify'
import { Step3Availability } from '@/components/sign-up/Step3Availability'
import { Step4Review } from '@/components/sign-up/Step4Review'
import { SubmissionSuccess } from '@/components/sign-up/SubmissionSuccess'
import { ViewApplication } from '@/components/sign-up/ViewApplication'
import { Card, CardContent } from '@/components/ui/card'
import { simulateTranscriptExtraction } from '@/lib/mock-transcript'
import type { Step1Data, Step2Data, Step3Data } from '@/lib/sign-up-schemas'
import { toast } from 'sonner'

export const Route = createFileRoute('/sign-up')({
    component: SignUpPage,
})

const STEPS = [
    'Personal Information',
    'Courses',
    'Available Times',
    'Review',
]

function SignUpPage() {
    const [currentStep, setCurrentStep] = useState(1)
    const [isProcessing, setIsProcessing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Collected data across steps
    const [step1Data, setStep1Data] = useState<Step1Data | null>(null)
    const [step2Data, setStep2Data] = useState<Step2Data | null>(null)
    const [step3Data, setStep3Data] = useState<Step3Data | null>(null)

    // ── Step 1 handler ─────────────────────────────────────────────────────
    async function handleStep1Next(data: Step1Data) {
        setStep1Data(data)
        setIsProcessing(true)

        try {
            const extracted = await simulateTranscriptExtraction(data.transcript)
            // Only pre-fill if we don't already have user-edited step2 data
            if (!step2Data) {
                setStep2Data(extracted)
            }
            setCurrentStep(2)
        } catch (err) {
            console.error('Transcript processing failed:', err)
        } finally {
            setIsProcessing(false)
        }
    }

    // ── Step 2 handler ─────────────────────────────────────────────────────
    function handleStep2Next(data: Step2Data) {
        setStep2Data(data)
        setCurrentStep(3)
    }

    // ── Step 3 handler ─────────────────────────────────────────────────────
    function handleStep3Next(availability: Record<string, number[]>) {
        setStep3Data({ availability })
        setCurrentStep(4)
    }

    // ── Submit handler ──────────────────────────────────────────────────────
    async function handleSubmit() {
        if (!step1Data || !step2Data || !step3Data) return

        setIsSubmitting(true)
        try {
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 2000))

            const payload = {
                student_id: parseInt(step1Data.studentId),
                email_address: step1Data.email,
                first_name: step1Data.firstName,
                last_name: step1Data.lastName,
                phone_number: step1Data.phoneNumber,
                transcript_metadata: {
                    overall_gpa: step2Data.overallGpa,
                    degree_gpa: step2Data.degreeGpa,
                    degree_programme: step2Data.degreeProgramme,
                    courses: step2Data.courses.map((c) => ({
                        [c.courseCode]: c.grade,
                    })),
                    current_level: step2Data.currentYear,
                },
                availability: step3Data.availability,
            }

            console.log('Submission payload:', JSON.stringify(payload, null, 2))
            setCurrentStep(5)
        } catch (err) {
            console.error('Submission failed:', err)
            toast.error('Something went wrong. Please try again.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-8 px-4">
            {currentStep <= 4 && (
                <>
                    <h1 className="text-2xl font-bold mb-2">Student Application</h1>
                    <p className="text-muted-foreground mb-8">
                        Complete the steps below to apply to be a Help Desk Assistant.
                    </p>
                    <StepIndicator steps={STEPS} currentStep={currentStep} />
                </>
            )}

            <Card className="border shadow-sm">
                <CardContent className="pt-6">
                    {currentStep === 1 && (
                        <Step1StudentInfo
                            defaultValues={step1Data ?? undefined}
                            onNext={handleStep1Next}
                            isProcessing={isProcessing}
                        />
                    )}

                    {currentStep === 2 && step2Data && (
                        <Step2TranscriptVerify
                            defaultValues={step2Data}
                            onNext={handleStep2Next}
                            onBack={() => setCurrentStep(1)}
                        />
                    )}

                    {currentStep === 3 && (
                        <Step3Availability
                            defaultValues={step3Data?.availability}
                            onNext={handleStep3Next}
                            onBack={() => setCurrentStep(2)}
                        />
                    )}

                    {currentStep === 4 && step1Data && step2Data && step3Data && (
                        <Step4Review
                            step1={step1Data}
                            step2={step2Data}
                            step3={step3Data}
                            onBack={() => setCurrentStep(3)}
                            onGoToStep={setCurrentStep}
                            onSubmit={handleSubmit}
                            isSubmitting={isSubmitting}
                        />
                    )}

                    {currentStep === 5 && (
                        <SubmissionSuccess
                            onViewApplication={() => setCurrentStep(6)}
                        />
                    )}

                    {currentStep === 6 && step1Data && step2Data && step3Data && (
                        <ViewApplication
                            step1={step1Data}
                            step2={step2Data}
                            step3={step3Data}
                        />
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

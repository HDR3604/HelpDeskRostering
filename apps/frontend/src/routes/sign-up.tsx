import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { StepIndicator } from '@/components/sign-up/StepIndicator'
import { Step1StudentInfo } from '@/components/sign-up/Step1StudentInfo'
import { Card, CardContent } from '@/components/ui/card'
import { simulateTranscriptExtraction } from '@/lib/mock-transcript'
import type { Step1Data, Step2Data, Step3Data } from '@/lib/sign-up-schemas'

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
            setStep2Data(extracted)
            setCurrentStep(2)
        } catch (err) {
            console.error('Transcript processing failed:', err)
        } finally {
            setIsProcessing(false)
        }
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-2">Student Registration</h1>
            <p className="text-muted-foreground mb-8">
                Complete the steps below to register as a Help Desk assistant.
            </p>

            <StepIndicator steps={STEPS} currentStep={currentStep} />

            <Card className="border shadow-sm">
                <CardContent className="pt-6">
                    {currentStep === 1 && (
                        <Step1StudentInfo
                            defaultValues={step1Data ?? undefined}
                            onNext={handleStep1Next}
                            isProcessing={isProcessing}
                        />
                    )}

                    {currentStep === 2 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Step 2: Courses — coming next</p>
                        </div>
                    )}

                    {currentStep === 3 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Step 3: Available Times — coming soon</p>
                        </div>
                    )}

                    {currentStep === 4 && (
                        <div className="text-center py-12 text-muted-foreground">
                            <p>Step 4: Review — coming soon</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}

import * as React from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { z } from "zod"
import { toast } from "sonner"
import { AlertCircle, GraduationCap } from "lucide-react"

import { useUser } from "@/hooks/use-user"
import { StepSetPassword } from "@/features/onboarding/components/step-set-password"
import {
  BankingDetailsForm,
  type BankingDetailsValues,
} from "@/features/student/components/banking-details-form"
import type { PasswordData } from "@/features/onboarding/lib/onboarding-schemas"

const searchSchema = z.object({
  token: z.string().catch(""),
})

export const Route = createFileRoute("/_auth/onboarding")({
  validateSearch: searchSchema,
  component: OnboardingPage,
})

const STEPS = [
  {
    title: "Set your password",
    description: "Create a secure password for your account.",
  },
  {
    title: "Banking details",
    description: "We need this to process your salary payments.",
  },
] as const

function OnboardingPage() {
  const { token } = Route.useSearch()
  const { setRole } = useUser()
  const navigate = useNavigate()

  const [step, setStep] = React.useState(0)
  const [passwordData, setPasswordData] = React.useState<PasswordData | null>(
    null
  )
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center space-y-3">
          <AlertCircle className="mx-auto size-10 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Invalid onboarding link
          </h1>
          <p className="text-muted-foreground">
            This link is missing a valid token. Please check your email for the
            correct onboarding link.
          </p>
        </div>
      </div>
    )
  }

  function handlePasswordNext(data: PasswordData) {
    setPasswordData(data)
    setStep(1)
  }

  async function handleBankingSubmit(values: BankingDetailsValues) {
    setIsSubmitting(true)

    const payload = {
      token,
      password: passwordData!.password,
      bankingDetails: values,
    }

    console.log("Onboarding payload:", payload)

    // Mock API delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    setIsSubmitting(false)
    setRole("student")
    toast.success("Onboarding complete! Welcome aboard.")
    navigate({ to: "/" })
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
                  i <= step ? "bg-primary" : "bg-muted"
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
          <p className="text-muted-foreground">{currentStep.description}</p>
        </div>

        {/* Step content */}
        {step === 0 && <StepSetPassword onNext={handlePasswordNext} />}
        {step === 1 && (
          <BankingDetailsForm
            embedded
            onSubmit={handleBankingSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Complete Onboarding"
          />
        )}
      </div>
    </div>
  )
}

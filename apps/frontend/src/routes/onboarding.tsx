import { createFileRoute } from "@tanstack/react-router"
import { useUser } from "@/hooks/use-user"
import { BankingDetailsForm } from "@/features/student/components/banking-details-form"

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { role } = useUser()

  if (role !== "student") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Student Onboarding
          </h1>
          <p className="mt-2 text-muted-foreground">
            This page is only available for students.
          </p>
        </div>
      </div>
    )
  }

  return <BankingDetailsForm />
}

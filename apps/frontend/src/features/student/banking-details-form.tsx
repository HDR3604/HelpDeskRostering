import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GraduationCap,
  Landmark,
  CreditCard,
  Hash,
} from "lucide-react"
import { Link } from "@tanstack/react-router"

import { useUser } from "@/hooks/use-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TT_BANKS = [
  "Bank of Baroda (Trinidad and Tobago) Limited",
  "Citibank (Trinidad and Tobago) Limited",
  "First Citizens Bank Limited",
  "FirstCaribbean International Bank (Trinidad and Tobago) Limited",
  "Intercommercial Bank Limited",
  "RBC Royal Bank (Trinidad and Tobago) Limited",
  "Republic Bank Limited",
  "Scotiabank Trinidad and Tobago Limited",
] as const

const bankingDetailsSchema = z.object({
  bankName: z.string().min(1, "Please select a bank"),
  branchName: z.string().min(1, "Branch name is required"),
  accountType: z.enum(["chequeing", "savings"], {
    required_error: "Please select an account type",
  }),
  accountNumber: z
    .string()
    .min(1, "Account number is required")
    .regex(/^\d+$/, "Account number must contain only digits"),
})

type BankingDetailsValues = z.infer<typeof bankingDetailsSchema>

const STEPS = [
  {
    title: "What bank do you use?",
    description: "We need this to route your payments correctly.",
    fields: ["bankName", "branchName"] as const,
    icon: Landmark,
    label: "Bank info",
  },
  {
    title: "What type of account is it?",
    description: "Select the account type you'd like to be paid into.",
    fields: ["accountType"] as const,
    icon: CreditCard,
    label: "Account type",
  },
  {
    title: "What's your account number?",
    description: "This is the account where your salary will be deposited.",
    fields: ["accountNumber"] as const,
    icon: Hash,
    label: "Account number",
  },
] as const

export function BankingDetailsForm() {
  const { currentStudent } = useUser()
  const [step, setStep] = React.useState(0)

  const form = useForm<BankingDetailsValues>({
    resolver: zodResolver(bankingDetailsSchema),
    defaultValues: {
      bankName: "",
      branchName: "",
      accountType: undefined,
      accountNumber: "",
    },
  })

  const currentStep = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  async function handleNext() {
    const valid = await form.trigger(
      currentStep.fields as unknown as (keyof BankingDetailsValues)[]
    )
    if (valid) setStep((s) => s + 1)
  }

  function handleBack() {
    setStep((s) => s - 1)
  }

  function onSubmit(values: BankingDetailsValues) {
    console.log("Banking details submitted:", values)
    toast.success("Banking details saved successfully")
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel — brand + step indicator */}
      <aside className="hidden w-80 flex-col justify-between border-r bg-muted/50 p-8 lg:flex xl:w-96">
        <div>
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-semibold">HelpDesk</span>
              <span className="text-xs text-muted-foreground">Rostering</span>
            </div>
          </Link>

          {/* Step list */}
          <nav className="mt-12 space-y-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isActive = i === step
              const isComplete = i < step

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : isComplete
                        ? "text-foreground"
                        : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      isComplete
                        ? "bg-primary text-primary-foreground"
                        : isActive
                          ? "border-2 border-primary text-primary"
                          : "border border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="size-3.5" />
                    ) : (
                      <Icon className="size-3.5" />
                    )}
                  </div>
                  <span className={isActive ? "font-medium" : ""}>
                    {s.label}
                  </span>
                </div>
              )
            })}
          </nav>
        </div>

        <p className="text-xs text-muted-foreground">
          Your information is encrypted and stored securely.
        </p>
      </aside>

      {/* Right panel — form */}
      <main className="flex flex-1 flex-col">
        {/* Mobile header */}
        <header className="flex items-center gap-3 border-b p-4 lg:hidden">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-4" />
            </div>
            <span className="font-semibold">HelpDesk</span>
          </Link>
        </header>

        {/* Form area — vertically centered */}
        <div className="flex flex-1 items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-md space-y-8">
            {/* Mobile progress bar */}
            <div className="space-y-3 lg:hidden">
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
              <p className="text-xs text-muted-foreground">
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

            {/* Form fields */}
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {step === 0 && (
                  <div className="space-y-5">
                    <FormField
                      control={form.control}
                      name="bankName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select your bank" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TT_BANKS.map((bank) => (
                                <SelectItem key={bank} value={bank}>
                                  {bank}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="branchName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Branch Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. St. Augustine"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 1 && (
                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select account type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="chequeing">Chequeing</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Choose whether this is a chequeing or savings account.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {step === 2 && (
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your account number"
                            inputMode="numeric"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Double-check this is correct — it's used for direct
                          deposit.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Navigation */}
                <div className="flex items-center gap-3 pt-2">
                  {step > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleBack}
                    >
                      <ArrowLeft className="mr-2 size-4" />
                      Back
                    </Button>
                  )}
                  <div className="flex-1" />
                  {isLastStep ? (
                    <Button type="submit">
                      <Check className="mr-2 size-4" />
                      Submit
                    </Button>
                  ) : (
                    <Button type="button" onClick={handleNext}>
                      Continue
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  )
}

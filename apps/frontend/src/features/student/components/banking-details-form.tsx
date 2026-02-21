import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { toast } from "sonner"
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronsUpDown,
  GraduationCap,
} from "lucide-react"

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { cn } from "@/lib/utils"

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
  branchName: z
    .string()
    .min(1, "Branch name is required")
    .max(100, "Branch name is too long"),
  accountType: z.enum(["chequeing", "savings"], {
    required_error: "Please select an account type",
  }),
  accountNumber: z
    .string()
    .min(1, "Account number is required")
    .regex(/^\d+$/, "Account number must contain only digits")
    .min(7, "Account number must be at least 7 digits")
    .max(16, "Account number must be at most 16 digits"),
  confirmAccountNumber: z
    .string()
    .min(1, "Please confirm your account number"),
}).refine((data) => data.accountNumber === data.confirmAccountNumber, {
  message: "Account numbers do not match",
  path: ["confirmAccountNumber"],
})

type BankingDetailsValues = z.infer<typeof bankingDetailsSchema>

const STEPS = [
  {
    title: "What bank do you use?",
    description: "We need this to route your payments correctly.",
    fields: ["bankName", "branchName"] as const,
  },
  {
    title: "What type of account is it?",
    description: "Select the account type you'd like to be paid into.",
    fields: ["accountType"] as const,
  },
  {
    title: "What's your account number?",
    description: "This is the account where your salary will be deposited.",
    fields: ["accountNumber", "confirmAccountNumber"] as const,
  },
] as const

export function BankingDetailsForm() {
  const [step, setStep] = React.useState(0)
  const [bankOpen, setBankOpen] = React.useState(false)

  const form = useForm<BankingDetailsValues>({
    resolver: zodResolver(bankingDetailsSchema),
    defaultValues: {
      bankName: "",
      branchName: "",
      accountType: undefined,
      accountNumber: "",
      confirmAccountNumber: "",
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && !isLastStep) {
      e.preventDefault()
      handleNext()
    }
  }

  function onSubmit(values: BankingDetailsValues) {
    console.log("Banking details submitted:", values)
    toast.success("Banking details saved successfully")
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
            <p className="text-muted-foreground">
              {currentStep.description}
            </p>
          </div>

          {/* Form */}
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              onKeyDown={handleKeyDown}
              className="space-y-8"
            >
              {step === 0 && (
                <div className="space-y-5">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Bank</FormLabel>
                        <Popover
                          open={bankOpen}
                          onOpenChange={setBankOpen}
                        >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={bankOpen}
                                className={cn(
                                  "w-full justify-between font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value || "Search for your bank..."}
                                <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput placeholder="Search banks..." />
                              <CommandList>
                                <CommandEmpty>No bank found.</CommandEmpty>
                                <CommandGroup>
                                  {TT_BANKS.map((bank) => (
                                    <CommandItem
                                      key={bank}
                                      value={bank}
                                      onSelect={() => {
                                        field.onChange(bank)
                                        setBankOpen(false)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 size-4",
                                          field.value === bank
                                            ? "opacity-100"
                                            : "opacity-0"
                                        )}
                                      />
                                      {bank}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
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
                <div className="space-y-5">
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="confirmAccountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Account Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Re-enter your account number"
                            inputMode="numeric"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Please re-enter to make sure it's correct.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center gap-3 pt-2">
                {step > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                  >
                    <ArrowLeft className="size-4" />
                    Back
                  </Button>
                )}
                <div className="flex-1" />
                {isLastStep ? (
                  <Button type="submit">
                    <Check className="size-4" />
                    Submit
                  </Button>
                ) : (
                  <Button type="button" onClick={handleNext}>
                    Continue
                    <ArrowRight className="size-4" />
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
    </div>
  )
}

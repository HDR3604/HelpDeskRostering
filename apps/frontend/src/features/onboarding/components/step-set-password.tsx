import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, X, Eye, EyeOff, ArrowRight } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  passwordSchema,
  PASSWORD_RULES,
  type PasswordData,
} from "@/features/onboarding/lib/onboarding-schemas"

interface StepSetPasswordProps {
  onNext: (data: PasswordData) => void
}

export function StepSetPassword({ onNext }: StepSetPasswordProps) {
  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const form = useForm<PasswordData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  })

  const passwordValue = form.watch("password")

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onNext)} className="space-y-8">
        <div className="space-y-5">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Requirements checklist */}
          <div className="space-y-2 rounded-lg border bg-card p-4">
            <p className="text-[13px] font-medium text-muted-foreground">
              Password must contain:
            </p>
            <ul className="space-y-1.5">
              {PASSWORD_RULES.map((rule) => {
                const passes = rule.test(passwordValue)
                return (
                  <li key={rule.label} className="flex items-center gap-2">
                    {passes ? (
                      <Check className="size-3.5 text-green-600 dark:text-green-400" />
                    ) : (
                      <X className="size-3.5 text-muted-foreground/40" />
                    )}
                    <span
                      className={`text-sm ${
                        passes
                          ? "text-green-700 dark:text-green-300"
                          : "text-muted-foreground"
                      }`}
                    >
                      {rule.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      placeholder="Re-enter your password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          <div className="flex-1" />
          <Button type="submit">
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </div>
      </form>
    </Form>
  )
}

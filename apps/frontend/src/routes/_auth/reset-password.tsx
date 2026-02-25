import { useState } from "react"
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router"
import { GraduationCap, Eye, EyeOff, AlertCircle } from "lucide-react"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"

import { resetPassword } from "@/lib/auth"
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

// Define search parameters type for token
type ResetPasswordSearch = {
    token?: string
}

export const Route = createFileRoute("/_auth/reset-password")({
    component: ResetPasswordComponent,
    validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => {
        return {
            token: typeof search.token === "string" ? search.token : undefined,
        }
    },
})

const resetPasswordSchema = z
    .object({
        password: z
            .string()
            .min(8, "Password must be at least 8 characters"),
        confirmPassword: z
            .string()
            .min(8, "Password must be at least 8 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"],
    })

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>

export function ResetPasswordComponent() {
    const { token } = Route.useSearch()
    const navigate = useNavigate()
    const [isSuccess, setIsSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [tokenError, setTokenError] = useState<string | null>(null)

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
    })

    // Early return for missing token
    if (!token) {
        return (
            <div className="flex h-full">
                <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                    <div className="w-full max-w-sm space-y-6 text-center">
                        <div className="flex justify-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="size-6" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-tight">
                                Missing Reset Token
                            </h1>
                            <p className="text-muted-foreground">
                                No password reset token was provided. Please request a new reset
                                link.
                            </p>
                        </div>
                        <Button asChild className="w-full">
                            <Link to="/forgot-password">Go to Forgot Password</Link>
                        </Button>
                    </div>
                </div>
            </div>
        )
    }

    const onSubmit = async (values: ResetPasswordValues) => {
        setTokenError(null)
        try {
            await resetPassword(token, values.password)
            setIsSuccess(true)
            toast.success("Password has been reset successfully.")
        } catch (err) {
            if (err instanceof Error) {
                setTokenError(err.message)
                toast.error(err.message)
            } else {
                toast.error("An unexpected error occurred.")
            }
        }
    }

    // Render for success or token error
    if (isSuccess || tokenError) {
        return (
            <div className="flex h-full">
                <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                    <div className="w-full max-w-sm space-y-6 text-center">
                        {/* Branded header */}
                        <div className="flex items-center justify-center gap-3">
                            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <GraduationCap className="size-5" />
                            </div>
                            <div className="flex flex-col text-left leading-none">
                                <span className="text-lg font-semibold">HelpDesk</span>
                                <span className="text-xs text-muted-foreground">Rostering</span>
                            </div>
                        </div>

                        {isSuccess ? (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        Password Reset!
                                    </h1>
                                    <p className="text-muted-foreground">
                                        Your password has been successfully reset. You can now sign
                                        in with your new password.
                                    </p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link to="/sign-in">Sign in</Link>
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-center">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                        <AlertCircle className="size-6" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight">
                                        Reset Link Invalid
                                    </h1>
                                    <p className="text-muted-foreground">{tokenError}</p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link to="/forgot-password">Request New Link</Link>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Default active form
    return (
        <div className="flex h-full">
            <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                <div className="w-full max-w-sm space-y-6">
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

                    {/* Heading */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Set new password
                        </h1>
                        <p className="text-muted-foreground">
                            Enter your new password below.
                        </p>
                    </div>

                    {/* Form */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="grid gap-2">
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                    aria-label={
                                                        showPassword ? "Hide password" : "Show password"
                                                    }
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

                            <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                    <FormItem className="grid gap-2">
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                                    onClick={() =>
                                                        setShowConfirmPassword(!showConfirmPassword)
                                                    }
                                                    tabIndex={-1}
                                                    aria-label={
                                                        showConfirmPassword
                                                            ? "Hide confirm password"
                                                            : "Show confirm password"
                                                    }
                                                >
                                                    {showConfirmPassword ? (
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

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting
                                    ? "Resetting..."
                                    : "Reset Password"}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>

            <div className="relative hidden w-1/2 shrink-0 p-4 lg:block">
                <img
                    src="/images/UwiFrontPage.webp"
                    alt="Student working at a desk"
                    className="absolute inset-4 h-[calc(100%-2rem)] w-[calc(100%-2rem)] rounded-xl object-cover dark:brightness-[0.8]"
                />
            </div>
        </div>
    )
}

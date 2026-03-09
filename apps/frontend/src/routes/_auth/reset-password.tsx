import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { GraduationCap, Eye, EyeOff, AlertCircle, Check, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

// import { resetPassword } from "@/lib/auth"
import { FormError } from '@/components/ui/form-error'
import {
    passwordSchema,
    PASSWORD_RULES,
    type PasswordData,
} from '@/features/onboarding/lib/onboarding-schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { AuthSidePanel } from '@/components/layout/auth-side-panel'

type ResetPasswordSearch = {
    token?: string
}

export const Route = createFileRoute('/_auth/reset-password')({
    component: ResetPasswordComponent,
    validateSearch: (search: Record<string, unknown>): ResetPasswordSearch => {
        return {
            token: typeof search.token === 'string' ? search.token : undefined,
        }
    },
})

const resetPasswordSchema = passwordSchema
type ResetPasswordValues = PasswordData

function BrandedHeader() {
    return (
        <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <GraduationCap className="size-5" />
            </div>
            <div className="flex flex-col text-left leading-none">
                <span className="text-lg font-semibold">HelpDesk</span>
                <span className="text-xs text-muted-foreground">Rostering</span>
            </div>
        </div>
    )
}

export function ResetPasswordComponent() {
    const { token } = Route.useSearch()

    const [isSuccess, setIsSuccess] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [error, setError] = useState('')
    const [tokenError, setTokenError] = useState<string | null>(null)

    const form = useForm<ResetPasswordValues>({
        resolver: zodResolver(resetPasswordSchema),
        defaultValues: {
            password: '',
            confirmPassword: '',
        },
    })

    const passwordValue = form.watch('password')

    // Missing token
    if (!token) {
        return (
            <div className="flex min-h-dvh">
                <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                    <div className="w-full max-w-sm space-y-6 text-center">
                        <BrandedHeader />

                        <div className="flex justify-center">
                            <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                <AlertCircle className="size-6" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                Missing Reset Token
                            </h1>
                            <p className="text-muted-foreground">
                                No password reset token was provided. Please
                                request a new reset link.
                            </p>
                        </div>

                        <Button asChild className="w-full">
                            <Link to="/forgot-password">Request New Link</Link>
                        </Button>
                    </div>
                </div>

                <AuthSidePanel />
            </div>
        )
    }

    const onSubmit = async (values: ResetPasswordValues) => {
        setTokenError(null)
        setError('')
        try {
            // await resetPassword(token, values.password)
            setIsSuccess(true)
        } catch (err) {
            if (err instanceof Error && err.message.includes('token')) {
                setTokenError(err.message)
            } else {
                setError(
                    err instanceof Error
                        ? err.message
                        : 'An unexpected error occurred. Please try again.',
                )
            }
        }
    }

    // Success or token error
    if (isSuccess || tokenError) {
        return (
            <div className="flex min-h-dvh">
                <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                    <div className="w-full max-w-sm space-y-6 text-center">
                        <BrandedHeader />

                        {isSuccess ? (
                            <>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                        Password Reset!
                                    </h1>
                                    <p className="text-muted-foreground">
                                        Your password has been successfully
                                        reset. You can now sign in with your new
                                        password.
                                    </p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link to="/sign-in">Sign in</Link>
                                </Button>
                            </>
                        ) : (
                            <>
                                <div className="flex justify-center">
                                    <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                                        <AlertCircle className="size-6" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                                        Reset Link Invalid
                                    </h1>
                                    <p className="text-muted-foreground">
                                        {tokenError}
                                    </p>
                                </div>
                                <Button asChild className="w-full">
                                    <Link to="/forgot-password">
                                        Request New Link
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>

                <AuthSidePanel />
            </div>
        )
    }

    // Default form
    return (
        <div className="flex min-h-dvh">
            <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                <div className="w-full max-w-sm space-y-6">
                    <BrandedHeader />

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
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="grid gap-4"
                        >
                            <FormField
                                control={form.control}
                                name="password"
                                render={({ field }) => (
                                    <FormItem className="grid gap-2">
                                        <FormLabel>New Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={
                                                        showPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    autoFocus
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                                    onClick={() =>
                                                        setShowPassword(
                                                            !showPassword,
                                                        )
                                                    }
                                                    tabIndex={-1}
                                                    aria-label={
                                                        showPassword
                                                            ? 'Hide password'
                                                            : 'Show password'
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

                            {/* Requirements checklist */}
                            <div className="space-y-2 rounded-lg border bg-card p-4">
                                <p className="text-[13px] font-medium text-muted-foreground">
                                    Password must contain:
                                </p>
                                <ul className="space-y-1.5">
                                    {PASSWORD_RULES.map((rule) => {
                                        const passes = rule.test(
                                            passwordValue || '',
                                        )
                                        return (
                                            <li
                                                key={rule.label}
                                                className="flex items-center gap-2"
                                            >
                                                {passes ? (
                                                    <Check className="size-3.5 text-green-600 dark:text-green-400" />
                                                ) : (
                                                    <X className="size-3.5 text-muted-foreground/40" />
                                                )}
                                                <span
                                                    className={`text-sm ${
                                                        passes
                                                            ? 'text-green-700 dark:text-green-300'
                                                            : 'text-muted-foreground'
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
                                    <FormItem className="grid gap-2">
                                        <FormLabel>Confirm Password</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Input
                                                    type={
                                                        showConfirmPassword
                                                            ? 'text'
                                                            : 'password'
                                                    }
                                                    placeholder="••••••••"
                                                    autoComplete="new-password"
                                                    {...field}
                                                />
                                                <button
                                                    type="button"
                                                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground hover:text-foreground"
                                                    onClick={() =>
                                                        setShowConfirmPassword(
                                                            !showConfirmPassword,
                                                        )
                                                    }
                                                    tabIndex={-1}
                                                    aria-label={
                                                        showConfirmPassword
                                                            ? 'Hide confirm password'
                                                            : 'Show confirm password'
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

                            {error && <FormError message={error} />}

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting
                                    ? 'Resetting...'
                                    : 'Reset Password'}
                            </Button>
                        </form>
                    </Form>
                </div>
            </div>

            <AuthSidePanel />
        </div>
    )
}

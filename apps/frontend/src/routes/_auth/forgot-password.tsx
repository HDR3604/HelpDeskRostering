import { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { GraduationCap } from 'lucide-react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'

// import { sendPasswordResetEmail } from "@/lib/auth"
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

export const Route = createFileRoute('/_auth/forgot-password')({
    component: ForgotPasswordComponent,
})

const forgotPasswordSchema = z.object({
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email')
        .refine(
            (val) => val.endsWith('@my.uwi.edu') || val.endsWith('@uwi.edu'),
            {
                message: 'Please enter a valid student or staff email address',
            },
        ),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export function ForgotPasswordComponent() {
    const [isSuccess, setIsSuccess] = useState(false)
    const [resendTimer, setResendTimer] = useState(0)

    const form = useForm<ForgotPasswordValues>({
        resolver: zodResolver(forgotPasswordSchema),
        defaultValues: {
            email: '',
        },
    })

    useEffect(() => {
        let interval: NodeJS.Timeout
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1)
            }, 1000)
        }
        return () => clearInterval(interval)
    }, [resendTimer])

    const onSubmit = async (values: ForgotPasswordValues) => {
        try {
            // await sendPasswordResetEmail(values.email)
            setIsSuccess(true)
            setResendTimer(30)
        } catch {
            toast.error(
                'Failed to send password reset email. Please try again.',
            )
        }
    }

    return (
        <div className="flex min-h-dvh">
            <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
                <div className="w-full max-w-sm space-y-6">
                    {/* Branded header */}
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                            <GraduationCap className="size-5" />
                        </div>
                        <div className="flex flex-col leading-none">
                            <span className="text-lg font-semibold">
                                HelpDesk
                            </span>
                            <span className="text-xs text-muted-foreground">
                                Rostering
                            </span>
                        </div>
                    </div>

                    {/* Heading */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            Reset your password
                        </h1>
                        <p className="text-muted-foreground">
                            Enter your email address to request a password reset
                            link.
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
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="grid gap-2">
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="email"
                                                placeholder="you@uwi.edu"
                                                autoComplete="email"
                                                disabled={
                                                    isSuccess ||
                                                    form.formState.isSubmitting
                                                }
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                className="w-full"
                                disabled={
                                    form.formState.isSubmitting ||
                                    (isSuccess && resendTimer > 0)
                                }
                            >
                                {form.formState.isSubmitting
                                    ? 'Sending...'
                                    : isSuccess
                                      ? resendTimer > 0
                                          ? `Resend available in ${resendTimer}s`
                                          : 'Resend email'
                                      : 'Send reset link'}
                            </Button>
                        </form>
                    </Form>

                    {isSuccess && !form.formState.isSubmitting && (
                        <div className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
                            <p>
                                Check your inbox! We've sent a password reset
                                link to{' '}
                                <strong>{form.getValues().email}</strong> if
                                it's associated with an account.
                            </p>
                        </div>
                    )}

                    <p className="text-center text-sm text-muted-foreground">
                        Remember your password?{' '}
                        <Link
                            to="/sign-in"
                            className="underline underline-offset-4 hover:text-foreground"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>

            <AuthSidePanel />
        </div>
    )
}

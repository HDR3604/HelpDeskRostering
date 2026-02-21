import { CheckCircle2, Mail } from 'lucide-react'

export function SubmissionSuccess() {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
            <div className="rounded-full bg-primary/10 p-4">
                <CheckCircle2 className="size-16 text-primary" />
            </div>

            <div className="space-y-3 max-w-md">
                <h1 className="text-3xl font-bold tracking-tight">
                    Thank you for your submission!
                </h1>
                <p className="text-muted-foreground leading-relaxed">
                    Your application has been successfully submitted and is now under review.
                </p>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-5 py-4 text-left max-w-md">
                <Mail className="mt-0.5 size-5 shrink-0 text-primary" />
                <div className="space-y-1">
                    <p className="text-sm font-medium">Check your inbox</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        We've sent a confirmation email with your application details. You'll receive another email once a decision has been made.
                    </p>
                </div>
            </div>
        </div>
    )
}

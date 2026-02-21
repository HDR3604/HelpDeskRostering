import { Button } from '@/components/ui/button'
import { CheckCircle2, Eye } from 'lucide-react'

interface SubmissionSuccessProps {
    onViewApplication: () => void
}

export function SubmissionSuccess({ onViewApplication }: SubmissionSuccessProps) {
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
                    Your application has been successfully submitted and is now under
                    review. You will be notified once a decision has been made.
                </p>
            </div>

            <Button size="lg" onClick={onViewApplication} className="mt-4">
                <Eye className="size-4" />
                View Application
            </Button>
        </div>
    )
}

import { AlertCircle } from 'lucide-react'

interface FormErrorProps {
    message: string
}

export function FormError({ message }: FormErrorProps) {
    return (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{message}</p>
        </div>
    )
}

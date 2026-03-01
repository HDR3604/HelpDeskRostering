import { useRouter } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/layout/error-state'

export function RouteError() {
    const router = useRouter()

    return (
        <ErrorState
            icon={<TriangleAlert />}
            iconVariant="destructive"
            title="Something went wrong"
            description="An unexpected error occurred. Please try again."
        >
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => router.history.back()}>
                    Go back
                </Button>
                <Button onClick={() => router.invalidate()}>Try again</Button>
            </div>
        </ErrorState>
    )
}

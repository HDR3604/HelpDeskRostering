import { Link } from '@tanstack/react-router'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/layout/error-state'

export function RouteNotFound() {
    return (
        <ErrorState
            icon={<FileQuestion />}
            title="Page not found"
            description="The page you're looking for doesn't exist or has been moved."
        >
            <Button variant="outline" asChild>
                <Link to="/">Go home</Link>
            </Button>
        </ErrorState>
    )
}

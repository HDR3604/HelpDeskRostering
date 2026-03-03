import { createFileRoute } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Applications } from '@/features/admin/student-management/applications'

export const Route = createFileRoute('/_app/applications')({
    component: ApplicationsPage,
})

function ApplicationsPage() {
    useDocumentTitle('Applications')
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Applications
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Review and manage student applications.
                </p>
            </div>
            <Applications />
        </div>
    )
}

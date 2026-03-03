import { createFileRoute } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'

export const Route = createFileRoute('/_app/settings')({
    component: SettingsPage,
})

function SettingsPage() {
    useDocumentTitle('Settings')
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Settings
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Application settings — coming soon.
                </p>
            </div>
        </div>
    )
}

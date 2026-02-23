import { createFileRoute } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/use-document-title"

export const Route = createFileRoute("/_app/applications")({
  component: ApplicationsPage,
})

function ApplicationsPage() {
  useDocumentTitle("Applications")
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
      <p className="mt-2 text-muted-foreground">Student applications management — coming soon.</p>
    </div>
  )
}

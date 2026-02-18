import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/applications")({
  component: ApplicationsPage,
})

function ApplicationsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Applications</h2>
      <p className="mt-2 text-muted-foreground">Student applications management — coming soon.</p>
    </div>
  )
}

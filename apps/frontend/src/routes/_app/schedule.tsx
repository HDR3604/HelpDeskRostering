import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/schedule")({
  component: SchedulePage,
})

function SchedulePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Schedule</h2>
      <p className="mt-2 text-muted-foreground">Schedule management — coming soon.</p>
    </div>
  )
}

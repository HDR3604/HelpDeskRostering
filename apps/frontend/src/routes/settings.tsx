import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      <p className="mt-2 text-muted-foreground">Application settings — coming soon.</p>
    </div>
  )
}

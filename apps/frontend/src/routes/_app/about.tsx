import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/about")({
  component: AboutComponent,
})

function AboutComponent() {
  return (
    <div className="p-2">
      <h3>About</h3>
    </div>
  )
}

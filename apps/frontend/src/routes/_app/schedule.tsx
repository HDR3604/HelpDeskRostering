import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_app/schedule")({
  component: ScheduleLayout,
})

function ScheduleLayout() {
  return <Outlet />
}

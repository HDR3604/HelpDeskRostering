import { Outlet, createFileRoute } from "@tanstack/react-router"
import { ThemeSwitcher } from "@/components/layout/theme-switcher"

export const Route = createFileRoute("/_auth")({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex shrink-0 justify-end border-b p-3">
        <ThemeSwitcher />
      </div>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

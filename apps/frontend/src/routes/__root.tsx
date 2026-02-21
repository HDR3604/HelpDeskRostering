import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "../hooks/use-theme"
import { UserProvider } from "../hooks/use-user"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"
import { ThemeSwitcher } from "@/components/layout/theme-switcher"
import { Toaster } from "@/components/ui/sonner"
import { useRouterState } from "@tanstack/react-router"

export const Route = createRootRoute({
  component: RootComponent,
  errorComponent: RouteError,
  notFoundComponent: RouteNotFound,
})

function RootComponent() {
  const { location } = useRouterState()
  const isSignUp = location.pathname === '/sign-up'

  return (
    <ThemeProvider>
      <UserProvider>
        <TooltipProvider>
          {isSignUp ? (
            // Clean layout for sign-up: no sidebar, no site header — only the theme toggle
            <div className="min-h-screen flex flex-col">
              <div className="flex justify-end p-3 border-b shrink-0">
                <ThemeSwitcher />
              </div>
              <main className="flex-1">
                <Outlet />
              </main>
            </div>
          ) : (
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <SiteHeader />
                <main className="flex-1 p-6">
                  <Outlet />
                </main>
              </SidebarInset>
            </SidebarProvider>
          )}
          <TanStackRouterDevtools position="bottom-right" />
          <Toaster />
        </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  )
}

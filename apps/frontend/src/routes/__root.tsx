import { Outlet, createRootRoute } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "../hooks/use-theme"
import { UserProvider } from "../hooks/use-user"
import { AppSidebar } from "../components/app-sidebar"
import { SiteHeader } from "../components/site-header"

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider>
      <UserProvider>
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <SiteHeader />
            <main className="flex-1 p-6">
              <Outlet />
            </main>
          </SidebarInset>
        </SidebarProvider>
        <TanStackRouterDevtools position="bottom-right" />
      </TooltipProvider>
      </UserProvider>
    </ThemeProvider>
  )
}

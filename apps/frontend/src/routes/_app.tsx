import { Outlet, createFileRoute, useLocation } from "@tanstack/react-router"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { SiteHeader } from "@/components/layout/site-header"

export const Route = createFileRoute("/_app")({
  component: AppLayout,
})

function AppLayout() {
  const { pathname } = useLocation()

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        <main className="flex-1 p-3 sm:p-6">
          <div key={pathname} className="animate-in fade-in duration-200">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

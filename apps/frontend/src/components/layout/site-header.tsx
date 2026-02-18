import { useRouterState } from "@tanstack/react-router"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { ThemeSwitcher } from "@/components/layout/theme-switcher"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/applications": "Applications",
  "/schedule": "Schedule",
  "/settings": "Settings",
  "/about": "About",
  "/showcase": "Component Showcase",
}

export function SiteHeader() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const pageTitle = PAGE_TITLES[currentPath] ?? "Page"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <ThemeSwitcher />
      </div>
    </header>
  )
}

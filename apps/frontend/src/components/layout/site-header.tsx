import { useMemo } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { Search, Settings, ArrowLeftRight, LogOut } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ThemeSwitcher } from "@/components/layout/theme-switcher"
import { useUser } from "@/hooks/use-user"
import { MOCK_SCHEDULES } from "@/lib/mock-data"

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/applications": "Applications",
  "/schedule": "Schedule",
  "/settings": "Settings",
  "/about": "About",
  "/showcase": "Component Showcase",
  "/onboarding": "Onboarding",
}

interface Crumb {
  label: string
  to?: string
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  // Exact match — single crumb, no link
  if (PAGE_TITLES[pathname]) {
    return [{ label: PAGE_TITLES[pathname] }]
  }

  const segments = pathname.split("/").filter(Boolean)
  if (segments.length === 0) return [{ label: "Dashboard" }]

  const crumbs: Crumb[] = []

  // Build parent crumbs (all but last segment)
  let path = ""
  for (let i = 0; i < segments.length - 1; i++) {
    path += "/" + segments[i]
    const title = PAGE_TITLES[path]
    if (title) {
      crumbs.push({ label: title, to: path })
    }
  }

  // Last segment — resolve dynamic title
  const lastSegment = segments[segments.length - 1]
  const parentPath = "/" + segments.slice(0, -1).join("/")

  let lastLabel: string | undefined

  // Schedule editor: resolve schedule title from ID
  if (parentPath === "/schedule") {
    const schedule = MOCK_SCHEDULES.find((s) => s.schedule_id === lastSegment)
    lastLabel = schedule?.title
  }

  crumbs.push({ label: lastLabel ?? lastSegment })
  return crumbs
}

export function SiteHeader() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { role, setRole, currentStudent } = useUser()

  const isAdmin = role === "admin"
  const userName = isAdmin ? "Admin User" : `${currentStudent.first_name} ${currentStudent.last_name}`
  const userEmail = isAdmin ? "admin@uwi.edu" : currentStudent.email_address
  const userInitials = isAdmin ? "AD" : `${currentStudent.first_name[0]}${currentStudent.last_name[0]}`

  const crumbs = useMemo(() => buildBreadcrumbs(currentPath), [currentPath])

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1
            return (
              <BreadcrumbItem key={crumb.label + i}>
                {i > 0 && <BreadcrumbSeparator />}
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to!}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="hidden h-9 w-56 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        >
          <Search className="size-3.5 shrink-0" />
          <span className="flex-1 text-left text-xs">Search...</span>
          <kbd className="pointer-events-none select-none rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground/70">
            ⌘K
          </kbd>
        </button>
        <ThemeSwitcher />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="rounded-full outline-none ring-ring focus-visible:ring-2 transition-opacity hover:opacity-75">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setRole(isAdmin ? "student" : "admin")}>
              <ArrowLeftRight className="mr-2 size-4" />
              Switch to {isAdmin ? "Student" : "Admin"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

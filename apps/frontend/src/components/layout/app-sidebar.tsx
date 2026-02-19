import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  ChevronsUpDown,
  LogOut,
  GraduationCap,
  ArrowLeftRight,
  ClipboardList,
} from "lucide-react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useUser } from "@/hooks/use-user"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const ADMIN_NAV = [
  { title: "Dashboard", to: "/", icon: LayoutDashboard },
  { title: "Applications", to: "/applications", icon: FileText },
  { title: "Schedule", to: "/schedule", icon: Calendar },
  { title: "Settings", to: "/settings", icon: Settings },
] as const

const STUDENT_NAV = [
  { title: "My Schedule", to: "/", icon: Calendar },
  { title: "Onboarding", to: "/onboarding", icon: ClipboardList },
  { title: "Settings", to: "/settings", icon: Settings },
] as const

export function AppSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const { role, setRole, currentStudent } = useUser()

  const navItems = role === "admin" ? ADMIN_NAV : STUDENT_NAV
  const isAdmin = role === "admin"

  const userName = isAdmin ? "Admin User" : `${currentStudent.first_name} ${currentStudent.last_name}`
  const userEmail = isAdmin ? "admin@uwi.edu" : currentStudent.email_address
  const userInitials = isAdmin ? "AD" : `${currentStudent.first_name[0]}${currentStudent.last_name[0]}`

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">HelpDesk</span>
                  <span className="text-xs text-muted-foreground">Rostering</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.to}
                  >
                    <Link to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0.5 leading-none">
                    <span className="text-sm font-medium">{userName}</span>
                    <span className="text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem onSelect={() => setRole(isAdmin ? "student" : "admin")}>
                  <ArrowLeftRight className="mr-2 size-4" />
                  Switch to {isAdmin ? "Student" : "Admin"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <LogOut className="mr-2 size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

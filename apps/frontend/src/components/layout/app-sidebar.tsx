import { useMemo } from "react"
import {
  LayoutDashboard,
  FileText,
  Calendar,
  Settings,
  GraduationCap,
  ArrowLeftRight,
  ClipboardList,
  Plus,
  ChevronRight,
  LogOut,
  ChevronsUpDown,
} from "lucide-react"
import { Link, useRouterState, useNavigate } from "@tanstack/react-router"
import { useUser } from "@/hooks/use-user"
import { MOCK_SCHEDULES, MOCK_STUDENTS } from "@/lib/mock-data"
import { getApplicationStatus } from "@/types/student"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function AppSidebar() {
  const router = useRouterState()
  const currentPath = router.location.pathname
  const navigate = useNavigate()
  const { role, setRole, currentStudent } = useUser()

  const isAdmin = role === "admin"
  const userName = isAdmin ? "Admin User" : `${currentStudent.first_name} ${currentStudent.last_name}`
  const userEmail = isAdmin ? "admin@uwi.edu" : currentStudent.email_address
  const userInitials = isAdmin ? "AD" : `${currentStudent.first_name[0]}${currentStudent.last_name[0]}`

  const pendingCount = useMemo(
    () => MOCK_STUDENTS.filter((s) => getApplicationStatus(s) === "pending").length,
    [],
  )

  const recentSchedules = useMemo(
    () => MOCK_SCHEDULES.slice(0, 3).map((s) => ({ title: s.title, to: `/schedule/${s.schedule_id}` })),
    [],
  )

  return (
    <Sidebar variant="inset">
      {/* Header / Branding */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCap className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">HelpDesk</span>
                  <span className="text-xs text-sidebar-foreground/70">Rostering</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent>
        {isAdmin ? (
          <>
            {/* Overview group */}
            <SidebarGroup>
              <SidebarGroupLabel>Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === "/"}
                      tooltip="Dashboard"
                    >
                      <Link to="/">
                        <LayoutDashboard />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Management group */}
            <SidebarGroup>
              <SidebarGroupLabel>Management</SidebarGroupLabel>
              <SidebarGroupAction
                title="Create Schedule"
                onClick={() => navigate({ to: "/schedule" })}
              >
                <Plus />
                <span className="sr-only">Create Schedule</span>
              </SidebarGroupAction>
              <SidebarGroupContent>
                <SidebarMenu>
                  {/* Applications */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === "/applications"}
                      tooltip="Applications"
                    >
                      <Link to="/applications">
                        <FileText />
                        <span>Applications</span>
                      </Link>
                    </SidebarMenuButton>
                    {pendingCount > 0 && (
                      <SidebarMenuBadge>{pendingCount}</SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>

                  {/* Schedule — collapsible with submenu */}
                  <Collapsible
                    defaultOpen={currentPath.startsWith("/schedule")}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip="Schedule"
                          isActive={currentPath.startsWith("/schedule")}
                        >
                          <Calendar />
                          <span>Schedule</span>
                          <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="gap-1.5 py-1">
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              asChild
                              isActive={currentPath === "/schedule"}
                              className="h-8"
                            >
                              <Link to="/schedule">
                                <span>All Schedules</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          {recentSchedules.map((s) => (
                            <SidebarMenuSubItem key={s.to}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={currentPath === s.to}
                                className="h-8"
                              >
                                <Link to={s.to}>
                                  <span>{s.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>

                  {/* Settings */}
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === "/settings"}
                      tooltip="Settings"
                    >
                      <Link to="/settings">
                        <Settings />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          /* Student navigation */
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/"}
                    tooltip="My Schedule"
                  >
                    <Link to="/">
                      <Calendar />
                      <span>My Schedule</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/onboarding"}
                    tooltip="Onboarding"
                  >
                    <Link to="/onboarding">
                      <ClipboardList />
                      <span>Onboarding</span>
                    </Link>
                  </SidebarMenuButton>
                  <SidebarMenuBadge>New</SidebarMenuBadge>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === "/settings"}
                    tooltip="Settings"
                  >
                    <Link to="/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer — user menu */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" tooltip={userName}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                    <span className="truncate text-sm font-medium">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

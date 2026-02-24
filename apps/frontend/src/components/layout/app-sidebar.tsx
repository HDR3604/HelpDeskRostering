import { useMemo } from 'react'
import {
    LayoutDashboard,
    FileText,
    Calendar,
    Settings,
    GraduationCap,
    ClipboardList,
    Plus,
    ChevronRight,
    LogOut,
    ChevronsUpDown,
    UserSearch,
} from 'lucide-react'
import { Link, useRouterState, useNavigate } from '@tanstack/react-router'
import { useUser } from '@/hooks/use-user'
import { logoutUser } from '@/lib/auth'
import { MOCK_SCHEDULES, MOCK_STUDENTS } from '@/lib/mock-data'
import { getApplicationStatus } from '@/types/student'

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
} from '@/components/ui/sidebar'
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export function AppSidebar() {
    const router = useRouterState()
    const currentPath = router.location.pathname
    const navigate = useNavigate()
    const { role, firstName, lastName, email } = useUser()

    const isOnAssistants = currentPath.startsWith('/assistants')

    const isAdmin = role === 'admin'
    const displayName =
        firstName && lastName ? `${firstName} ${lastName}` : (email ?? '')
    const userInitials =
        firstName && lastName
            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
            : (email ?? '').slice(0, 2).toUpperCase()

    const pendingCount = useMemo(
        () =>
            MOCK_STUDENTS.filter((s) => getApplicationStatus(s) === 'pending')
                .length,
        [],
    )

    const recentSchedules = useMemo(
        () =>
            MOCK_SCHEDULES.slice(0, 3).map((s) => ({
                title: s.title,
                to: `/schedule/${s.schedule_id}`,
            })),
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
                                    <span className="font-semibold">
                                        HelpDesk
                                    </span>
                                    <span className="text-xs text-sidebar-foreground/70">
                                        Rostering
                                    </span>
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
                                            isActive={currentPath === '/'}
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
                                onClick={() => navigate({ to: '/schedule' })}
                            >
                                <Plus />
                                <span className="sr-only">Create Schedule</span>
                            </SidebarGroupAction>
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {/* Schedule — collapsible with submenu */}
                                    <Collapsible
                                        defaultOpen={currentPath.startsWith(
                                            '/schedule',
                                        )}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    tooltip="Schedule"
                                                    isActive={currentPath.startsWith(
                                                        '/schedule',
                                                    )}
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
                                                            isActive={
                                                                currentPath ===
                                                                '/schedule'
                                                            }
                                                            className="h-8"
                                                        >
                                                            <Link to="/schedule">
                                                                <span>
                                                                    All
                                                                    Schedules
                                                                </span>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                    {recentSchedules.map(
                                                        (s) => (
                                                            <SidebarMenuSubItem
                                                                key={s.to}
                                                            >
                                                                <SidebarMenuSubButton
                                                                    asChild
                                                                    isActive={
                                                                        currentPath ===
                                                                        s.to
                                                                    }
                                                                    className="h-8"
                                                                >
                                                                    <Link
                                                                        to={
                                                                            s.to
                                                                        }
                                                                    >
                                                                        <span>
                                                                            {
                                                                                s.title
                                                                            }
                                                                        </span>
                                                                    </Link>
                                                                </SidebarMenuSubButton>
                                                            </SidebarMenuSubItem>
                                                        ),
                                                    )}
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>
                                    {/* Applications */}
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={
                                                currentPath === '/applications'
                                            }
                                            tooltip="Applications"
                                        >
                                            <Link to="/applications">
                                                <FileText />
                                                <span>Applications</span>
                                            </Link>
                                        </SidebarMenuButton>
                                        {pendingCount > 0 && (
                                            <SidebarMenuBadge>
                                                {pendingCount}
                                            </SidebarMenuBadge>
                                        )}
                                    </SidebarMenuItem>
                                    {/* Assistants — collapsible with submenu */}
                                    <Collapsible
                                        defaultOpen={isOnAssistants}
                                        className="group/collapsible"
                                    >
                                        <SidebarMenuItem>
                                            <CollapsibleTrigger asChild>
                                                <SidebarMenuButton
                                                    tooltip="Assistants"
                                                    isActive={isOnAssistants}
                                                >
                                                    <UserSearch />
                                                    <span>Assistants</span>
                                                    <ChevronRight className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                                                </SidebarMenuButton>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <SidebarMenuSub className="gap-1.5 py-1">
                                                    <SidebarMenuSubItem>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={
                                                                isOnAssistants &&
                                                                !currentPath.endsWith(
                                                                    '/payments',
                                                                )
                                                            }
                                                            className="h-8"
                                                        >
                                                            <Link to="/assistants">
                                                                <span>
                                                                    Team
                                                                </span>
                                                                <kbd className="ml-auto text-[10px] font-mono text-sidebar-foreground/40">
                                                                    1
                                                                </kbd>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                    <SidebarMenuSubItem>
                                                        <SidebarMenuSubButton
                                                            asChild
                                                            isActive={
                                                                currentPath ===
                                                                '/assistants/payments'
                                                            }
                                                            className="h-8"
                                                        >
                                                            <Link to="/assistants/payments">
                                                                <span>
                                                                    Payroll
                                                                </span>
                                                                <kbd className="ml-auto text-[10px] font-mono text-sidebar-foreground/40">
                                                                    2
                                                                </kbd>
                                                            </Link>
                                                        </SidebarMenuSubButton>
                                                    </SidebarMenuSubItem>
                                                </SidebarMenuSub>
                                            </CollapsibleContent>
                                        </SidebarMenuItem>
                                    </Collapsible>

                                    {/* Settings */}
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            asChild
                                            isActive={
                                                currentPath === '/settings'
                                            }
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
                                        isActive={currentPath === '/'}
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
                                        isActive={currentPath === '/onboarding'}
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
                                        isActive={currentPath === '/settings'}
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
                                <SidebarMenuButton
                                    size="lg"
                                    tooltip={displayName}
                                >
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className="text-xs">
                                            {userInitials}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                                        <span className="truncate text-sm font-medium">
                                            {displayName}
                                        </span>
                                        <span className="truncate text-xs text-muted-foreground">
                                            {email}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto size-4 shrink-0 text-muted-foreground" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                align="start"
                                className="w-56"
                            >
                                <DropdownMenuItem asChild>
                                    <Link to="/settings">
                                        <Settings className="mr-2 size-4" />
                                        Settings
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={() => {
                                        logoutUser()
                                        navigate({ to: '/sign-in' })
                                    }}
                                >
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

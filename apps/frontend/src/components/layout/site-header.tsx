import React, { useMemo } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { Search, Settings, LogOut } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { useUser, useLogout } from '@/lib/auth'
import { scheduleKeys } from '@/lib/queries/schedules'
import type { ScheduleResponse } from '@/types/schedule'

const PAGE_TITLES: Record<string, string> = {
    '/': 'Dashboard',
    '/applications': 'Applications',
    '/assistants': 'Assistants',
    '/assistants/payments': 'Payroll',
    '/assistants/time-logs': 'Time Logs',
    '/schedule': 'Schedule',
    '/settings': 'Settings',
    '/settings/scheduler': 'Scheduler',
    '/settings/availability': 'Availability',
    '/settings/payment': 'Payment',
    '/complete-onboarding': 'Complete Onboarding',
    '/clock': 'Time Clock',
    '/clock-in-station': 'Clock-In Station',
}

interface Crumb {
    label: string
    to?: string
}

function buildBreadcrumbs(
    pathname: string,
    resolveScheduleTitle?: (id: string) => string | undefined,
): Crumb[] {
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 0) return [{ label: 'Dashboard' }]

    // Single segment — exact match, no link
    if (segments.length === 1 && PAGE_TITLES['/' + segments[0]]) {
        return [{ label: PAGE_TITLES['/' + segments[0]] }]
    }

    const crumbs: Crumb[] = []

    // Build parent crumbs (all but last segment)
    let path = ''
    for (let i = 0; i < segments.length - 1; i++) {
        path += '/' + segments[i]
        const title = PAGE_TITLES[path]
        if (title) {
            crumbs.push({ label: title, to: path })
        }
    }

    // Last segment — resolve from PAGE_TITLES or dynamic title
    const fullPath = '/' + segments.join('/')
    const lastSegment = segments[segments.length - 1]
    const parentPath = '/' + segments.slice(0, -1).join('/')

    let lastLabel: string | undefined = PAGE_TITLES[fullPath]

    // Schedule editor: resolve schedule title from query cache
    if (!lastLabel && parentPath === '/schedule' && resolveScheduleTitle) {
        lastLabel = resolveScheduleTitle(lastSegment)
    }

    crumbs.push({ label: lastLabel ?? lastSegment })
    return crumbs
}

export function SiteHeader() {
    const router = useRouterState()
    const currentPath = router.location.pathname
    const { firstName, lastName, email } = useUser()
    const queryClient = useQueryClient()

    const logout = useLogout()
    const displayName =
        firstName && lastName ? `${firstName} ${lastName}` : (email ?? '')
    const userInitials =
        firstName && lastName
            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
            : (email ?? '').slice(0, 2).toUpperCase()

    const crumbs = useMemo(() => {
        const resolveScheduleTitle = (id: string): string | undefined => {
            // Check detail cache first
            const detail = queryClient.getQueryData<ScheduleResponse>(
                scheduleKeys.detail(id),
            )
            if (detail?.title) return detail.title

            // Fall back to list cache
            const lists = queryClient.getQueryData<ScheduleResponse[]>(
                scheduleKeys.list('all'),
            )
            return lists?.find((s) => s.schedule_id === id)?.title
        }

        return buildBreadcrumbs(currentPath, resolveScheduleTitle)
    }, [currentPath, queryClient])

    return (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />

            <Breadcrumb>
                <BreadcrumbList>
                    {crumbs.map((crumb, i) => {
                        const isLast = i === crumbs.length - 1
                        return (
                            <React.Fragment key={crumb.label + i}>
                                {i > 0 && <BreadcrumbSeparator />}
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage>
                                            {crumb.label}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link to={crumb.to!}>
                                                {crumb.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                            </React.Fragment>
                        )
                    })}
                </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto flex items-center gap-2">
                <button
                    type="button"
                    className="hidden h-9 w-56 items-center gap-2 rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex"
                    onClick={() =>
                        window.dispatchEvent(
                            new KeyboardEvent('keydown', {
                                key: 'k',
                                metaKey: true,
                            }),
                        )
                    }
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
                        <button
                            type="button"
                            className="rounded-full outline-none ring-ring focus-visible:ring-2 transition-opacity hover:opacity-75"
                        >
                            <Avatar className="size-8">
                                <AvatarFallback className="text-xs">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex min-w-0 flex-col gap-1">
                                <p className="truncate text-sm font-medium leading-none">
                                    {displayName}
                                </p>
                                <p className="truncate text-xs leading-none text-muted-foreground">
                                    {email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link to="/settings">
                                <Settings className="mr-2 size-4" />
                                Settings
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => logout()}>
                            <LogOut className="mr-2 size-4" />
                            Sign out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}

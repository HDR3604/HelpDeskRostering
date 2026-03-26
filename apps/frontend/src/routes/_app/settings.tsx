import {
    createFileRoute,
    Link,
    Outlet,
    useRouterState,
} from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useUser } from '@/lib/auth/hooks/use-user'
import { MonitorCog, UserPen, CalendarClock, DollarSign } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings')({
    component: SettingsLayout,
})

const adminNavItems = [
    {
        label: 'Profile',
        to: '/settings',
        icon: UserPen,
        exact: true as const,
    },
    {
        label: 'Scheduler',
        to: '/settings/scheduler',
        icon: MonitorCog,
        exact: false as const,
    },
]

const studentNavItems = [
    {
        label: 'Profile',
        to: '/settings',
        icon: UserPen,
        exact: true as const,
    },
    {
        label: 'Availability',
        to: '/settings/availability',
        icon: CalendarClock,
        exact: false as const,
    },
    {
        label: 'Payment',
        to: '/settings/payment',
        icon: DollarSign,
        exact: false as const,
    },
]

function SettingsLayout() {
    useDocumentTitle('Settings')
    const { role } = useUser()
    const router = useRouterState()
    const currentPath = router.location.pathname

    const navItems = role === 'student' ? studentNavItems : adminNavItems

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Settings
                </h1>
                <p className="mt-1 text-muted-foreground">
                    {role === 'student'
                        ? 'Manage your profile, availability, and payment details'
                        : 'Manage your profile and scheduler configurations'}
                </p>
            </div>

            {/* Mobile: horizontal scrollable tabs */}
            <nav className="flex gap-1 overflow-x-auto border-b pb-px md:hidden">
                {navItems.map(({ label, to, icon: Icon, exact }) => {
                    const isActive = exact
                        ? currentPath === to || currentPath === to + '/'
                        : currentPath.startsWith(to)
                    return (
                        <Link
                            key={to}
                            to={to}
                            className={cn(
                                'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors',
                                isActive
                                    ? 'border-foreground text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* Desktop: sidebar + content */}
            <div className="flex gap-8">
                <nav className="hidden w-48 shrink-0 space-y-1 md:block">
                    {navItems.map(({ label, to, icon: Icon, exact }) => {
                        const isActive = exact
                            ? currentPath === to || currentPath === to + '/'
                            : currentPath.startsWith(to)
                        return (
                            <Link
                                key={to}
                                to={to}
                                className={cn(
                                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-muted text-foreground'
                                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {label}
                            </Link>
                        )
                    })}
                </nav>
                <div className="min-w-0 flex-1">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

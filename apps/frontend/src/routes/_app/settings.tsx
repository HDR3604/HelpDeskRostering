import {
    createFileRoute,
    Link,
    Outlet,
    useRouterState,
} from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { useUser } from '@/lib/auth/hooks/use-user'
import { MonitorCog, UserPen } from 'lucide-react'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/settings')({
    component: SettingsLayout,
})

interface NavItem {
    label: string
    to: string
    icon: React.ComponentType<{ className?: string }>
    exact: boolean
    adminOnly?: boolean
}

const navItems: NavItem[] = [
    { label: 'Profile', to: '/settings', icon: UserPen, exact: true },
    {
        label: 'Scheduler',
        to: '/settings/scheduler',
        icon: MonitorCog,
        exact: false,
        adminOnly: true,
    },
]

function SettingsLayout() {
    useDocumentTitle('Settings')
    const { role } = useUser()
    const router = useRouterState()
    const currentPath = router.location.pathname

    const visibleNavItems = navItems.filter(
        (item) => !item.adminOnly || role === 'admin',
    )

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Settings
                </h1>
                <p className="mt-1 text-muted-foreground">
                    {role === 'student'
                        ? 'Update your information and availability'
                        : 'Update your information and scheduler configurations'}
                </p>
            </div>
            <div className="flex gap-8">
                <nav className="w-48 shrink-0 space-y-1">
                    {visibleNavItems.map(({ label, to, icon: Icon, exact }) => {
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
                <div className="flex-1 min-w-0">
                    <Outlet />
                </div>
            </div>
        </div>
    )
}

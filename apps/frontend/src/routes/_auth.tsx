import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { isAuthenticated, ensureValidToken } from '@/lib/auth'

export const Route = createFileRoute('/_auth')({
    beforeLoad: async () => {
        // Try to refresh expired tokens before checking auth state
        try {
            await ensureValidToken()
        } catch {
            /* no valid session — fall through to show auth page */
        }

        if (isAuthenticated()) {
            throw redirect({ to: '/' })
        }
    },
    component: AuthLayout,
})

function AuthLayout() {
    return (
        <div className="relative h-dvh overflow-auto">
            <div className="fixed left-4 top-4 z-50">
                <ThemeSwitcher />
            </div>
            <Outlet />
        </div>
    )
}

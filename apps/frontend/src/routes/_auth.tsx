import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { isAuthenticated } from '@/lib/auth'
import { ensureValidToken } from '@/lib/api-client'

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
        <div className="flex h-dvh flex-col">
            <div className="flex shrink-0 justify-end border-b p-3">
                <ThemeSwitcher />
            </div>
            <main className="flex-1 overflow-auto">
                <Outlet />
            </main>
        </div>
    )
}

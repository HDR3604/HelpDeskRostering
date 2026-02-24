import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { isAuthenticated } from '@/lib/auth'

export const Route = createFileRoute('/_auth')({
    beforeLoad: () => {
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

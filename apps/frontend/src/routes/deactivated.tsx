import { createFileRoute, redirect } from '@tanstack/react-router'
import { ShieldX, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeSwitcher } from '@/components/layout/theme-switcher'
import { useLogout } from '@/lib/auth'
import { requireAuth, getTokenPayload } from '@/lib/auth'

export const Route = createFileRoute('/deactivated')({
    beforeLoad: async (ctx) => {
        await requireAuth(ctx)

        // Only students can be deactivated — admins go home
        const payload = getTokenPayload()
        if (payload?.role !== 'student') {
            throw redirect({ to: '/' })
        }
    },
    component: DeactivatedPage,
})

function DeactivatedPage() {
    const logout = useLogout()

    return (
        <div className="relative flex h-dvh items-center justify-center bg-background">
            <div className="fixed left-4 top-4 z-50">
                <ThemeSwitcher />
            </div>

            <div className="mx-auto max-w-md px-6 text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-destructive/10">
                    <ShieldX className="size-8 text-destructive" />
                </div>

                <h1 className="mt-6 text-2xl font-bold tracking-tight">
                    Account Deactivated
                </h1>

                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Your account has been deactivated by an administrator. You
                    no longer have access to the HelpDesk Rostering system.
                </p>

                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    If you believe this is a mistake, please contact the Help
                    Desk supervisor.
                </p>

                <Button variant="outline" className="mt-8" onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                </Button>
            </div>
        </div>
    )
}

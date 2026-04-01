import {
    Outlet,
    createFileRoute,
    redirect,
    useLocation,
} from '@tanstack/react-router'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SiteHeader } from '@/components/layout/site-header'
import { CommandPalette } from '@/components/layout/command-palette'
import { StudentProvider } from '@/features/admin/student-management/student-context'
import { requireAuth, getTokenPayload } from '@/lib/auth'
import { getMyBankingDetails, getMyStudentProfile } from '@/lib/api/students'
import {
    isOnboardingVerified,
    markOnboardingVerified,
} from '@/lib/auth/onboarding-check'

export const Route = createFileRoute('/_app')({
    beforeLoad: async (ctx) => {
        await requireAuth(ctx)

        const payload = getTokenPayload()
        if (payload?.role === 'student') {
            // A student with a JWT always has a profile (accepted + onboarded).
            // Check deactivation before anything else.
            const profile = await getMyStudentProfile()
            if (profile.status === 'deactivated') {
                throw redirect({ to: '/deactivated' })
            }

            // Check onboarding (banking details)
            if (
                !isOnboardingVerified() &&
                ctx.location.pathname !== '/complete-onboarding'
            ) {
                try {
                    await getMyBankingDetails()
                    markOnboardingVerified()
                } catch {
                    throw redirect({ to: '/complete-onboarding' })
                }
            }
        }
    },
    component: AppLayout,
})

function AppLayout() {
    const { pathname } = useLocation()

    return (
        <StudentProvider>
            <SidebarProvider>
                <AppSidebar />
                <SidebarInset>
                    <SiteHeader />
                    <div className="flex-1 p-3 sm:p-6">
                        <div
                            key={pathname}
                            className="animate-in fade-in duration-200"
                        >
                            <Outlet />
                        </div>
                    </div>
                </SidebarInset>
                <CommandPalette />
            </SidebarProvider>
        </StudentProvider>
    )
}

import { createFileRoute } from '@tanstack/react-router'
import { useUser, getTokenPayload } from '@/lib/auth'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { AdminDashboard } from '@/features/admin/admin-dashboard'
import { AdminDashboardSkeleton } from '@/features/admin/skeletons/admin-dashboard-skeleton'
import { StudentDashboard } from '@/features/student/student-dashboard'
import { StudentDashboardSkeleton } from '@/features/student/skeletons/student-dashboard-skeleton'
import { queryClient } from '@/routes/__root'
import { listStudents, getMyStudentProfile } from '@/lib/api/students'
import { getActiveSchedule } from '@/lib/api/schedules'
import { listShiftTemplates } from '@/lib/api/shift-templates'
import { listTimeLogs } from '@/lib/api/time-logs'
import { studentKeys } from '@/lib/queries/students'
import { scheduleKeys } from '@/lib/queries/schedules'
import { shiftTemplateKeys } from '@/lib/queries/shift-templates'
import { timeLogKeys } from '@/lib/queries/time-logs'

export const Route = createFileRoute('/_app/')({
    beforeLoad: () => {
        const payload = getTokenPayload()
        const today = new Date().toISOString().slice(0, 10)

        if (payload?.role === 'admin') {
            // Fire all admin queries in parallel — don't await, just prime the cache
            queryClient.prefetchQuery({
                queryKey: studentKeys.list(),
                queryFn: () => listStudents(),
                staleTime: 30_000,
            })
            queryClient.prefetchQuery({
                queryKey: scheduleKeys.active(),
                queryFn: getActiveSchedule,
                staleTime: 30_000,
            })
            queryClient.prefetchQuery({
                queryKey: shiftTemplateKeys.list(),
                queryFn: listShiftTemplates,
                staleTime: 5 * 60_000,
            })
            queryClient.prefetchQuery({
                queryKey: timeLogKeys.list({ from: today, to: today }),
                queryFn: () =>
                    listTimeLogs({ from: today, to: today, per_page: 100 }),
                staleTime: 15_000,
            })
        } else {
            // Fire student queries in parallel
            queryClient.prefetchQuery({
                queryKey: studentKeys.me(),
                queryFn: getMyStudentProfile,
                staleTime: 30_000,
            })
            queryClient.prefetchQuery({
                queryKey: scheduleKeys.active(),
                queryFn: getActiveSchedule,
                staleTime: 30_000,
            })
            queryClient.prefetchQuery({
                queryKey: shiftTemplateKeys.list(),
                queryFn: listShiftTemplates,
                staleTime: 5 * 60_000,
            })
        }
    },
    component: DashboardPage,
    pendingComponent: () => {
        const payload = getTokenPayload()
        if (payload?.role === 'student') return <StudentDashboardSkeleton />
        return <AdminDashboardSkeleton />
    },
})

function DashboardPage() {
    const { role } = useUser()
    useDocumentTitle('Dashboard')

    if (role === 'student') {
        return <StudentDashboard />
    }

    return <AdminDashboard />
}

import { createFileRoute, redirect } from '@tanstack/react-router'
import { TimeLogsManager } from '@/features/admin/student-management/time-logs-manager'
import { getTokenPayload } from '@/lib/auth'
import { queryClient } from '@/routes/__root'
import { listTimeLogs } from '@/lib/api/time-logs'
import { timeLogKeys } from '@/lib/queries/time-logs'

export const Route = createFileRoute('/_app/assistants/time-logs')({
    beforeLoad: () => {
        const payload = getTokenPayload()
        if (payload?.role !== 'admin') {
            throw redirect({ to: '/' })
        }

        void queryClient
            .prefetchQuery({
                queryKey: timeLogKeys.list({ per_page: 100 }),
                queryFn: () => listTimeLogs({ per_page: 100 }),
                staleTime: 30_000,
            })
            .catch(() => undefined)
    },
    component: TimeLogsPage,
})

function TimeLogsPage() {
    return <TimeLogsManager />
}

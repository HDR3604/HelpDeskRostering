import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { TimeLogsManager } from '@/features/admin/student-management/time-logs-manager'
import { getTokenPayload } from '@/lib/auth'

const timeLogsSearchSchema = z.object({
    log_id: z.string().optional(),
})

export const Route = createFileRoute('/_app/assistants/time-logs')({
    validateSearch: timeLogsSearchSchema,
    beforeLoad: () => {
        const payload = getTokenPayload()
        if (payload?.role !== 'admin') {
            throw redirect({ to: '/' })
        }
    },
    component: TimeLogsPage,
})

function TimeLogsPage() {
    const { log_id } = Route.useSearch()
    return <TimeLogsManager initialLogId={log_id} />
}

import { createFileRoute } from '@tanstack/react-router'
import { TimeLogsManager } from '@/features/admin/student-management/time-logs-manager'

export const Route = createFileRoute('/_app/assistants/time-logs')({
    component: TimeLogsPage,
})

function TimeLogsPage() {
    return <TimeLogsManager />
}

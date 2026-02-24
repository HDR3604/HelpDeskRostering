import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { CalendarX } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/layout/error-state'
import type { ScheduleResponse } from '@/types/schedule'
import {
    MOCK_SCHEDULES,
    MOCK_SHIFT_TEMPLATES,
    MOCK_STUDENTS,
} from '@/lib/mock-data'
import { ScheduleEditor } from '@/features/admin/schedule/schedule-editor'
import { ScheduleEditorSkeleton } from '@/features/admin/skeletons/schedule-editor-skeleton'

export const Route = createFileRoute('/_app/schedule/$scheduleId')({
    component: ScheduleEditorPage,
    pendingComponent: ScheduleEditorSkeleton,
})

function ScheduleEditorPage() {
    const { scheduleId } = Route.useParams()
    const navigate = useNavigate()

    const schedule = MOCK_SCHEDULES.find((s) => s.schedule_id === scheduleId)
    useDocumentTitle(schedule?.title ?? 'Schedule')

    if (!schedule) {
        return (
            <ErrorState
                icon={<CalendarX />}
                title="Schedule not found"
                description="The schedule you're looking for doesn't exist or has been removed."
            >
                <Button variant="outline" asChild>
                    <Link to="/schedule">Back to schedules</Link>
                </Button>
            </ErrorState>
        )
    }

    function handleSave(updated: ScheduleResponse) {
        const idx = MOCK_SCHEDULES.findIndex(
            (s) => s.schedule_id === updated.schedule_id,
        )
        if (idx >= 0) {
            MOCK_SCHEDULES[idx] = updated
        }
    }

    function handleBack() {
        navigate({ to: '/schedule' })
    }

    return (
        <div className="mx-auto max-w-7xl">
            <ScheduleEditor
                key={scheduleId}
                schedule={schedule}
                shiftTemplates={MOCK_SHIFT_TEMPLATES}
                students={MOCK_STUDENTS}
                onSave={handleSave}
                onBack={handleBack}
            />
        </div>
    )
}

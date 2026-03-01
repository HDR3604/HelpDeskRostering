import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { CalendarX } from 'lucide-react'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/layout/error-state'
import type { ScheduleResponse } from '@/types/schedule'
import { useSchedule, scheduleKeys } from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { MOCK_STUDENTS } from '@/lib/mock-data'
import { ScheduleEditor } from '@/features/admin/schedule/schedule-editor'
import { ScheduleEditorSkeleton } from '@/features/admin/skeletons/schedule-editor-skeleton'

export const Route = createFileRoute('/_app/schedule/$scheduleId')({
    component: ScheduleEditorPage,
    pendingComponent: ScheduleEditorSkeleton,
})

function ScheduleEditorPage() {
    const { scheduleId } = Route.useParams()
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    const scheduleQuery = useSchedule(scheduleId)
    const shiftTemplatesQuery = useShiftTemplates()

    const schedule = scheduleQuery.data
    const shiftTemplates = shiftTemplatesQuery.data ?? []
    const isLoading = scheduleQuery.isLoading || shiftTemplatesQuery.isLoading
    const isNotFound =
        scheduleQuery.error &&
        (
            scheduleQuery.error as {
                response?: { status?: number }
            }
        )?.response?.status === 404
    const error = scheduleQuery.error || shiftTemplatesQuery.error

    useDocumentTitle(schedule?.title ?? 'Schedule')

    if (isLoading) return <ScheduleEditorSkeleton />

    if (isNotFound) {
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

    if (error || !schedule) {
        return (
            <ErrorState
                icon={<CalendarX />}
                title="Something went wrong"
                description="Failed to load schedule. Please try again."
            />
        )
    }

    function handleSave(updated: ScheduleResponse) {
        queryClient.setQueryData<ScheduleResponse>(
            scheduleKeys.detail(scheduleId),
            updated,
        )
        queryClient.invalidateQueries({ queryKey: scheduleKeys.lists() })
    }

    function handleBack() {
        navigate({ to: '/schedule' })
    }

    return (
        <div className="mx-auto max-w-7xl">
            <ScheduleEditor
                key={scheduleId}
                schedule={schedule}
                shiftTemplates={shiftTemplates}
                students={MOCK_STUDENTS}
                onSave={handleSave}
                onBack={handleBack}
            />
        </div>
    )
}

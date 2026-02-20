import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { ScheduleResponse } from "@/types/schedule"
import { MOCK_SCHEDULES, MOCK_SHIFT_TEMPLATES, MOCK_STUDENTS } from "@/lib/mock-data"
import { ScheduleEditor } from "@/features/admin/schedule/schedule-editor"
import { ScheduleEditorSkeleton } from "@/features/admin/schedule/schedule-editor-skeleton"

export const Route = createFileRoute("/_app/schedule/$scheduleId")({
  component: ScheduleEditorPage,
  pendingComponent: ScheduleEditorSkeleton,
})

function ScheduleEditorPage() {
  const { scheduleId } = Route.useParams()
  const navigate = useNavigate()

  const schedule = MOCK_SCHEDULES.find((s) => s.schedule_id === scheduleId)

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-semibold">Schedule not found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          The schedule you're looking for doesn't exist.
        </p>
      </div>
    )
  }

  function handleSave(updated: ScheduleResponse) {
    const idx = MOCK_SCHEDULES.findIndex((s) => s.schedule_id === updated.schedule_id)
    if (idx >= 0) {
      MOCK_SCHEDULES[idx] = updated
    }
  }

  function handleBack() {
    navigate({ to: "/schedule" })
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

import { createFileRoute, useNavigate, Link } from "@tanstack/react-router"
import { CalendarX } from "lucide-react"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { Button } from "@/components/ui/button"
import type { ScheduleResponse } from "@/types/schedule"
import { MOCK_SCHEDULES, MOCK_SHIFT_TEMPLATES, MOCK_STUDENTS } from "@/lib/mock-data"
import { ScheduleEditor } from "@/features/admin/schedule/schedule-editor"
import { ScheduleEditorSkeleton } from "@/features/admin/skeletons/schedule-editor-skeleton"

export const Route = createFileRoute("/_app/schedule/$scheduleId")({
  component: ScheduleEditorPage,
  pendingComponent: ScheduleEditorSkeleton,
})

function ScheduleEditorPage() {
  const { scheduleId } = Route.useParams()
  const navigate = useNavigate()

  const schedule = MOCK_SCHEDULES.find((s) => s.schedule_id === scheduleId)
  useDocumentTitle(schedule?.title ?? "Schedule")

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <CalendarX className="h-6 w-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold">Schedule not found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The schedule you're looking for doesn't exist or has been removed.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/schedule">Back to schedules</Link>
        </Button>
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

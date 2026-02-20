import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { ScheduleResponse } from "@/types/schedule"
import { MOCK_SCHEDULES, MOCK_STUDENTS } from "@/lib/mock-data"
import { ScheduleListView } from "@/features/admin/schedule/schedule-list-view"
import { CreateScheduleDialog } from "@/features/admin/schedule/create-schedule-dialog"

export const Route = createFileRoute("/_app/schedule/")({
  component: ScheduleListPage,
})

function ScheduleListPage() {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<ScheduleResponse[]>(MOCK_SCHEDULES)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  function handleCreateSchedule(newSchedule: ScheduleResponse) {
    setSchedules((prev) => [newSchedule, ...prev])
    setCreateDialogOpen(false)
    navigate({ to: "/schedule/$scheduleId", params: { scheduleId: newSchedule.schedule_id } })
  }

  function handleOpenSchedule(id: string) {
    navigate({ to: "/schedule/$scheduleId", params: { scheduleId: id } })
  }

  return (
    <div className="mx-auto max-w-7xl">
      <ScheduleListView
        schedules={schedules}
        onCreateNew={() => setCreateDialogOpen(true)}
        onOpenSchedule={handleOpenSchedule}
      />
      <CreateScheduleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        students={MOCK_STUDENTS}
        onCreated={handleCreateSchedule}
      />
    </div>
  )
}

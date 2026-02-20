import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import type { ScheduleResponse } from "@/types/schedule"
import { MOCK_SCHEDULES, MOCK_STUDENTS, MOCK_SHIFT_TEMPLATES, STUDENT_NAME_MAP, MOCK_HOURS_WORKED, MOCK_MISSED_SHIFTS, MOCK_HOURS_TREND, MOCK_SCHEDULER_CONFIGS } from "@/lib/mock-data"
import { ScheduleListView } from "@/features/admin/schedule/schedule-list-view"
import { CreateScheduleDialog } from "@/features/admin/schedule/create-schedule-dialog"
import { RenameScheduleDialog } from "@/features/admin/schedule/rename-schedule-dialog"
import { ActivateScheduleDialog } from "@/features/admin/schedule/activate-schedule-dialog"

export const Route = createFileRoute("/_app/schedule/")({
  component: ScheduleListPage,
})

function ScheduleListPage() {
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<ScheduleResponse[]>(MOCK_SCHEDULES)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Rename
  const [renameTarget, setRenameTarget] = useState<ScheduleResponse | null>(null)

  // Activate
  const [activateTarget, setActivateTarget] = useState<ScheduleResponse | null>(null)

  function handleCreateSchedule(newSchedule: ScheduleResponse) {
    setSchedules((prev) => [newSchedule, ...prev])
    setCreateDialogOpen(false)
    navigate({ to: "/schedule/$scheduleId", params: { scheduleId: newSchedule.schedule_id } })
  }

  function handleOpenSchedule(id: string) {
    navigate({ to: "/schedule/$scheduleId", params: { scheduleId: id } })
  }

  function handleRename(newTitle: string) {
    if (!renameTarget) return
    setSchedules((prev) =>
      prev.map((s) =>
        s.schedule_id === renameTarget.schedule_id ? { ...s, title: newTitle } : s,
      ),
    )
  }

  function handleSetActive() {
    if (!activateTarget) return
    setSchedules((prev) =>
      prev.map((s) => ({
        ...s,
        is_active: s.schedule_id === activateTarget.schedule_id,
        archived_at: s.schedule_id === activateTarget.schedule_id ? null : s.archived_at,
      })),
    )
    setActivateTarget(null)
  }

  function handleDownload(schedule: ScheduleResponse) {
    const data = JSON.stringify(schedule, null, 2)
    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${schedule.title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleArchive(schedule: ScheduleResponse) {
    setSchedules((prev) =>
      prev.map((s) =>
        s.schedule_id === schedule.schedule_id
          ? { ...s, archived_at: new Date().toISOString(), is_active: false }
          : s,
      ),
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <ScheduleListView
        schedules={schedules}
        shiftTemplates={MOCK_SHIFT_TEMPLATES}
        studentNames={STUDENT_NAME_MAP}
        hoursWorked={MOCK_HOURS_WORKED}
        missedShifts={MOCK_MISSED_SHIFTS}
        hoursTrend={MOCK_HOURS_TREND}
        onCreateNew={() => setCreateDialogOpen(true)}
        onOpenSchedule={handleOpenSchedule}
        onRename={setRenameTarget}
        onSetActive={setActivateTarget}
        onDownload={handleDownload}
        onArchive={handleArchive}
      />

      <CreateScheduleDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        students={MOCK_STUDENTS}
        configs={MOCK_SCHEDULER_CONFIGS}
        onCreated={handleCreateSchedule}
      />

      <RenameScheduleDialog
        open={renameTarget !== null}
        onOpenChange={(open) => { if (!open) setRenameTarget(null) }}
        currentTitle={renameTarget?.title ?? ""}
        onRename={handleRename}
      />

      <ActivateScheduleDialog
        open={activateTarget !== null}
        onOpenChange={(open) => { if (!open) setActivateTarget(null) }}
        scheduleTitle={activateTarget?.title ?? ""}
        onConfirm={handleSetActive}
      />
    </div>
  )
}

import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import type { ScheduleResponse } from "@/types/schedule"
import { MOCK_SCHEDULES, MOCK_SHIFT_TEMPLATES, MOCK_STUDENTS } from "@/lib/mock-data"
import { ScheduleListView } from "@/features/admin/schedule/schedule-list-view"
import { CreateScheduleDialog } from "@/features/admin/schedule/create-schedule-dialog"
import { ScheduleEditor } from "@/features/admin/schedule/schedule-editor"

export const Route = createFileRoute("/_app/schedule")({
  component: SchedulePage,
})

function SchedulePage() {
  const [view, setView] = useState<"list" | "editor">("list")
  const [schedules, setSchedules] = useState<ScheduleResponse[]>(MOCK_SCHEDULES)
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const editingSchedule = schedules.find((s) => s.schedule_id === editingScheduleId) ?? null

  function handleCreateSchedule(newSchedule: ScheduleResponse) {
    setSchedules((prev) => [newSchedule, ...prev])
    setEditingScheduleId(newSchedule.schedule_id)
    setCreateDialogOpen(false)
    setView("editor")
  }

  function handleOpenSchedule(id: string) {
    setEditingScheduleId(id)
    setView("editor")
  }

  function handleSaveSchedule(updated: ScheduleResponse) {
    setSchedules((prev) => prev.map((s) => (s.schedule_id === updated.schedule_id ? updated : s)))
  }

  function handleBack() {
    setView("list")
    setEditingScheduleId(null)
  }

  if (view === "editor" && editingSchedule) {
    return (
      <ScheduleEditor
        key={editingSchedule.schedule_id}
        schedule={editingSchedule}
        shiftTemplates={MOCK_SHIFT_TEMPLATES}
        students={MOCK_STUDENTS}
        onSave={handleSaveSchedule}
        onBack={handleBack}
      />
    )
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

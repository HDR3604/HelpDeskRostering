import { lazy, Suspense, useState } from "react"
import { toast } from "sonner"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { ScheduleResponse } from "@/types/schedule"
import { MOCK_SCHEDULES, MOCK_STUDENTS, MOCK_SHIFT_TEMPLATES, STUDENT_NAME_MAP, MOCK_HOURS_WORKED, MOCK_MISSED_SHIFTS, MOCK_HOURS_TREND, MOCK_SCHEDULER_CONFIGS } from "@/lib/mock-data"
import { ScheduleListView } from "@/features/admin/schedule/schedule-list-view"
import { ScheduleListSkeleton } from "@/features/admin/skeletons/schedule-list-skeleton"
import { RenameScheduleDialog } from "@/features/admin/schedule/components/rename-schedule-dialog"
import { ActivateScheduleDialog } from "@/features/admin/schedule/components/activate-schedule-dialog"
import { NotifyStudentsDialog } from "@/features/admin/schedule/components/notify-students-dialog"
import { ConfirmDialog } from "@/features/admin/schedule/components/confirm-dialog"

const CreateScheduleDialog = lazy(() =>
  import("@/features/admin/schedule/components/create-schedule-dialog").then((m) => ({ default: m.CreateScheduleDialog })),
)

export const Route = createFileRoute("/_app/schedule/")({
  component: ScheduleListPage,
  pendingComponent: ScheduleListSkeleton,
})

function ScheduleListPage() {
  useDocumentTitle("Schedule")
  const navigate = useNavigate()
  const [schedules, setSchedules] = useState<ScheduleResponse[]>(MOCK_SCHEDULES)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  // Rename
  const [renameTarget, setRenameTarget] = useState<ScheduleResponse | null>(null)

  // Activate
  const [activateTarget, setActivateTarget] = useState<ScheduleResponse | null>(null)

  // Notify
  const [notifyTarget, setNotifyTarget] = useState<ScheduleResponse | null>(null)

  // Archive / Deactivate confirmations
  const [archiveTarget, setArchiveTarget] = useState<ScheduleResponse | null>(null)
  const [deactivateTarget, setDeactivateTarget] = useState<ScheduleResponse | null>(null)

  function handleCreateSchedule(newSchedule: ScheduleResponse) {
    // Add to global mock array so the editor route can find it
    MOCK_SCHEDULES.unshift(newSchedule)
    setSchedules((prev) => [newSchedule, ...prev])
    setCreateDialogOpen(false)
    navigate({ to: "/schedule/$scheduleId", params: { scheduleId: newSchedule.schedule_id } })
  }

  function handleOpenSchedule(id: string) {
    navigate({ to: "/schedule/$scheduleId", params: { scheduleId: id } })
  }

  function handleRename(newTitle: string) {
    if (!renameTarget) return
    try {
      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === renameTarget.schedule_id ? { ...s, title: newTitle } : s,
        ),
      )
      toast.success("Schedule renamed", { description: `Renamed to "${newTitle}".` })
    } catch {
      toast.error("Failed to rename", { description: "Something went wrong. Please try again." })
    }
  }

  function handleSetActive(notify: boolean) {
    if (!activateTarget) return
    const title = activateTarget.title
    try {
      setSchedules((prev) =>
        prev.map((s) => ({
          ...s,
          is_active: s.schedule_id === activateTarget.schedule_id,
          archived_at: s.schedule_id === activateTarget.schedule_id ? null : s.archived_at,
        })),
      )
      setActivateTarget(null)
      toast.success("Schedule activated", {
        description: `"${title}" is now active.${notify ? " Students have been notified." : ""}`,
      })
    } catch {
      toast.error("Failed to activate", { description: "Something went wrong. Please try again." })
    }
  }

  function handleDownload(schedule: ScheduleResponse) {
    try {
      const data = JSON.stringify(schedule, null, 2)
      const blob = new Blob([data], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${schedule.title.replace(/[^a-zA-Z0-9-_ ]/g, "")}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Schedule downloaded", { description: `"${schedule.title}" has been exported.` })
    } catch {
      toast.error("Failed to download", { description: "Something went wrong. Please try again." })
    }
  }

  function handleConfirmArchive() {
    if (!archiveTarget) return
    const title = archiveTarget.title
    try {
      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === archiveTarget.schedule_id
            ? { ...s, archived_at: new Date().toISOString(), is_active: false }
            : s,
        ),
      )
      toast.success("Schedule archived", { description: `"${title}" has been archived.` })
    } catch {
      toast.error("Failed to archive", { description: "Something went wrong. Please try again." })
    }
    setArchiveTarget(null)
  }

  function handleConfirmDeactivate() {
    if (!deactivateTarget) return
    const title = deactivateTarget.title
    try {
      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === deactivateTarget.schedule_id
            ? { ...s, is_active: false }
            : s,
        ),
      )
      toast.success("Schedule deactivated", { description: `"${title}" is no longer active.` })
    } catch {
      toast.error("Failed to deactivate", { description: "Something went wrong. Please try again." })
    }
    setDeactivateTarget(null)
  }

  function handleUnarchive(schedule: ScheduleResponse) {
    try {
      setSchedules((prev) =>
        prev.map((s) =>
          s.schedule_id === schedule.schedule_id
            ? { ...s, archived_at: null }
            : s,
        ),
      )
      toast.success("Schedule unarchived", { description: `"${schedule.title}" has been restored.` })
    } catch {
      toast.error("Failed to unarchive", { description: "Something went wrong. Please try again." })
    }
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
        creatingSchedule={createDialogOpen}
        onOpenSchedule={handleOpenSchedule}
        onRename={setRenameTarget}
        onSetActive={setActivateTarget}
        onDownload={handleDownload}
        onArchive={setArchiveTarget}
        onUnarchive={handleUnarchive}
        onDeactivate={setDeactivateTarget}
        onNotify={setNotifyTarget}
      />

      {createDialogOpen && (
        <Suspense>
          <CreateScheduleDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            students={MOCK_STUDENTS}
            configs={MOCK_SCHEDULER_CONFIGS}
            onCreated={handleCreateSchedule}
          />
        </Suspense>
      )}

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

      <NotifyStudentsDialog
        open={notifyTarget !== null}
        onOpenChange={(open) => { if (!open) setNotifyTarget(null) }}
        scheduleTitle={notifyTarget?.title ?? ""}
        onConfirm={() => {
          const title = notifyTarget?.title
          try {
            setNotifyTarget(null)
            toast.success("Notifications sent", {
              description: `All students assigned to "${title}" have been notified.`,
            })
          } catch {
            toast.error("Failed to notify", { description: "Something went wrong. Please try again." })
          }
        }}
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}
        title="Archive Schedule"
        description={<>This will archive <span className="font-medium text-foreground">"{archiveTarget?.title}"</span>. It will no longer appear in the active list.</>}
        confirmLabel="Archive"
        onConfirm={handleConfirmArchive}
      />

      <ConfirmDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => { if (!open) setDeactivateTarget(null) }}
        title="Deactivate Schedule"
        description={<>This will deactivate <span className="font-medium text-foreground">"{deactivateTarget?.title}"</span>. Students will no longer see it as the current schedule.</>}
        confirmLabel="Deactivate"
        onConfirm={handleConfirmDeactivate}
      />
    </div>
  )
}

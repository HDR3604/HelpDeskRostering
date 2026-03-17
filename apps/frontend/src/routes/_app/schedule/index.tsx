import { lazy, Suspense, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarX } from 'lucide-react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useDocumentTitle } from '@/hooks/use-document-title'
import type { ScheduleResponse } from '@/types/schedule'
import {
    useSchedules,
    useRenameSchedule,
    useArchiveSchedule,
    useUnarchiveSchedule,
    useActivateSchedule,
    useDeactivateSchedule,
    useNotifyStudents,
    scheduleKeys,
} from '@/lib/queries/schedules'
import { useShiftTemplates } from '@/lib/queries/shift-templates'
import { useSchedulerConfigs } from '@/lib/queries/scheduler-configs'
import { useStudents } from '@/lib/queries/students'
import { buildStudentNameMap } from '@/lib/mock-data'
import { ScheduleListView } from '@/features/admin/schedule/schedule-list-view'
import { ScheduleListSkeleton } from '@/features/admin/skeletons/schedule-list-skeleton'
import { RenameScheduleDialog } from '@/features/admin/schedule/components/rename-schedule-dialog'
import { ActivateScheduleDialog } from '@/features/admin/schedule/components/activate-schedule-dialog'
import { NotifyStudentsDialog } from '@/features/admin/schedule/components/notify-students-dialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ErrorState } from '@/components/layout/error-state'

const CreateScheduleDialog = lazy(() =>
    import('@/features/admin/schedule/components/create-schedule-dialog').then(
        (m) => ({ default: m.CreateScheduleDialog }),
    ),
)

export const Route = createFileRoute('/_app/schedule/')({
    component: ScheduleListPage,
    pendingComponent: ScheduleListSkeleton,
})

function ScheduleListPage() {
    useDocumentTitle('Schedule')
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Queries
    const schedulesQuery = useSchedules()
    const shiftTemplatesQuery = useShiftTemplates()
    const configsQuery = useSchedulerConfigs()
    const studentsQuery = useStudents()

    const schedules = schedulesQuery.data ?? []
    const shiftTemplates = shiftTemplatesQuery.data ?? []
    const configs = configsQuery.data ?? []
    const students = studentsQuery.data ?? []
    const studentNames = useMemo(
        () => buildStudentNameMap(students),
        [students],
    )

    const activeSchedule = schedules.find((s) => s.status === 'active') ?? null
    const assignments = useMemo(
        () =>
            Array.isArray(activeSchedule?.assignments)
                ? activeSchedule.assignments
                : [],
        [activeSchedule],
    )

    const hoursAssigned = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const a of assignments) {
            counts[a.assistant_id] = (counts[a.assistant_id] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([id, hours], i) => ({
                name: studentNames[id] || id,
                hours,
                fill: `var(--chart-${(i % 5) + 1})`,
            }))
            .sort((a, b) => b.hours - a.hours)
    }, [assignments, studentNames])

    const shiftAttendance = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const a of assignments) {
            counts[a.assistant_id] = (counts[a.assistant_id] ?? 0) + 1
        }
        return Object.entries(counts)
            .map(([id, total], i) => ({
                name: studentNames[id] || id,
                missed: 0, // no time logs yet
                total,
                fill: `var(--chart-${(i % 5) + 1})`,
            }))
            .sort((a, b) => b.total - a.total)
    }, [assignments, studentNames])

    // Mutations
    const renameMutation = useRenameSchedule()
    const archiveMutation = useArchiveSchedule()
    const unarchiveMutation = useUnarchiveSchedule()
    const activateMutation = useActivateSchedule()
    const deactivateMutation = useDeactivateSchedule()
    const notifyMutation = useNotifyStudents()

    // Dialogs
    const [createDialogOpen, setCreateDialogOpen] = useState(false)
    const [renameTarget, setRenameTarget] = useState<ScheduleResponse | null>(
        null,
    )
    const [activateTarget, setActivateTarget] =
        useState<ScheduleResponse | null>(null)
    const [notifyTarget, setNotifyTarget] = useState<ScheduleResponse | null>(
        null,
    )
    const [archiveTarget, setArchiveTarget] = useState<ScheduleResponse | null>(
        null,
    )
    const [deactivateTarget, setDeactivateTarget] =
        useState<ScheduleResponse | null>(null)

    const isLoading =
        schedulesQuery.isLoading ||
        shiftTemplatesQuery.isLoading ||
        configsQuery.isLoading ||
        studentsQuery.isLoading
    const error =
        schedulesQuery.error ||
        shiftTemplatesQuery.error ||
        configsQuery.error ||
        studentsQuery.error

    if (isLoading) return <ScheduleListSkeleton />
    if (error)
        return (
            <ErrorState
                icon={<CalendarX />}
                title="Something went wrong"
                description="Failed to load schedules. Please try again."
            />
        )

    function handleOpenSchedule(id: string) {
        navigate({
            to: '/schedule/$scheduleId',
            params: { scheduleId: id },
        })
    }

    function handleDownload(schedule: ScheduleResponse) {
        try {
            const data = JSON.stringify(schedule, null, 2)
            const blob = new Blob([data], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${schedule.title.replace(/[^a-zA-Z0-9-_ ]/g, '')}.json`
            a.click()
            URL.revokeObjectURL(url)
            toast.success('Schedule downloaded', {
                description: `"${schedule.title}" has been exported.`,
            })
        } catch {
            toast.error('Failed to download', {
                description: 'Something went wrong. Please try again.',
            })
        }
    }

    return (
        <div className="mx-auto max-w-7xl">
            <ScheduleListView
                schedules={schedules}
                shiftTemplates={shiftTemplates}
                studentNames={studentNames}
                hoursWorked={hoursAssigned}
                missedShifts={shiftAttendance}
                hoursTrend={[]}
                onCreateNew={() => setCreateDialogOpen(true)}
                creatingSchedule={createDialogOpen}
                onOpenSchedule={handleOpenSchedule}
                onRename={setRenameTarget}
                onSetActive={setActivateTarget}
                onDownload={handleDownload}
                onArchive={setArchiveTarget}
                onUnarchive={(s) =>
                    unarchiveMutation.mutate(s.schedule_id, {
                        onSuccess: () =>
                            toast.success('Schedule unarchived', {
                                description: `"${s.title}" has been restored.`,
                            }),
                    })
                }
                onDeactivate={setDeactivateTarget}
                onNotify={setNotifyTarget}
            />

            {createDialogOpen && (
                <Suspense>
                    <CreateScheduleDialog
                        open={createDialogOpen}
                        onOpenChange={setCreateDialogOpen}
                        students={students}
                        configs={configs}
                        onCreated={(created) => {
                            queryClient.invalidateQueries({
                                queryKey: scheduleKeys.lists(),
                            })
                            setCreateDialogOpen(false)
                            navigate({
                                to: '/schedule/$scheduleId',
                                params: {
                                    scheduleId: created.schedule_id,
                                },
                            })
                        }}
                    />
                </Suspense>
            )}

            <RenameScheduleDialog
                open={renameTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setRenameTarget(null)
                }}
                currentTitle={renameTarget?.title ?? ''}
                onRename={(newTitle) => {
                    if (!renameTarget) return
                    renameMutation.mutate({
                        id: renameTarget.schedule_id,
                        title: newTitle,
                    })
                }}
            />

            <ActivateScheduleDialog
                open={activateTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setActivateTarget(null)
                }}
                scheduleTitle={activateTarget?.title ?? ''}
                onConfirm={(notify) => {
                    if (!activateTarget) return
                    const id = activateTarget.schedule_id
                    const title = activateTarget.title
                    activateMutation.mutate(id, {
                        onSuccess: () => {
                            setActivateTarget(null)
                            toast.success('Schedule activated', {
                                description: `"${title}" is now active.`,
                            })
                            if (notify) {
                                notifyMutation.mutate(id, {
                                    onSuccess: (res) =>
                                        toast.success('Students notified', {
                                            description: `${res.notified_count} student(s) have been emailed.`,
                                        }),
                                })
                            }
                        },
                    })
                }}
            />

            <NotifyStudentsDialog
                open={notifyTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setNotifyTarget(null)
                }}
                scheduleTitle={notifyTarget?.title ?? ''}
                onConfirm={() => {
                    if (!notifyTarget) return
                    const title = notifyTarget.title
                    notifyMutation.mutate(notifyTarget.schedule_id, {
                        onSuccess: (res) => {
                            setNotifyTarget(null)
                            toast.success('Notifications sent', {
                                description: `${res.notified_count} student(s) assigned to "${title}" have been notified.`,
                            })
                        },
                    })
                }}
            />

            <ConfirmDialog
                open={archiveTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setArchiveTarget(null)
                }}
                title="Archive Schedule"
                description={
                    <>
                        This will archive{' '}
                        <span className="font-medium text-foreground">
                            "{archiveTarget?.title}"
                        </span>
                        . It will no longer appear in the active list.
                    </>
                }
                confirmLabel="Archive"
                destructive
                onConfirm={() => {
                    if (!archiveTarget) return
                    const title = archiveTarget.title
                    archiveMutation.mutate(archiveTarget.schedule_id, {
                        onSuccess: () => {
                            toast.success('Schedule archived', {
                                description: `"${title}" has been archived.`,
                            })
                        },
                    })
                    setArchiveTarget(null)
                }}
            />

            <ConfirmDialog
                open={deactivateTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setDeactivateTarget(null)
                }}
                title="Deactivate Schedule"
                description={
                    <>
                        This will deactivate{' '}
                        <span className="font-medium text-foreground">
                            "{deactivateTarget?.title}"
                        </span>
                        . Students will no longer see it as the current
                        schedule.
                    </>
                }
                confirmLabel="Deactivate"
                destructive
                onConfirm={() => {
                    if (!deactivateTarget) return
                    const title = deactivateTarget.title
                    deactivateMutation.mutate(deactivateTarget.schedule_id, {
                        onSuccess: () => {
                            setDeactivateTarget(null)
                            toast.success('Schedule deactivated', {
                                description: `"${title}" is no longer active.`,
                            })
                        },
                    })
                }}
            />
        </div>
    )
}

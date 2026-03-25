import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { getTimeLogColumns } from '@/features/admin/columns/time-log-columns'
import {
    useTimeLogs,
    useFlagTimeLog,
    useUnflagTimeLog,
} from '@/lib/queries/time-logs'
import type { AdminTimeLogResponse } from '@/lib/api/time-logs'
import { Loader2, Clock } from 'lucide-react'

export function TimeLogsManager() {
    const { data, isLoading, isFetching } = useTimeLogs({ per_page: 100 })

    const logs = data?.data ?? []
    const flaggedCount = useMemo(
        () => logs.filter((l) => l.is_flagged).length,
        [logs],
    )

    const flagMutation = useFlagTimeLog()
    const unflagMutation = useUnflagTimeLog()

    const [flagTarget, setFlagTarget] = useState<AdminTimeLogResponse | null>(
        null,
    )
    const [flagReason, setFlagReason] = useState('')
    const [unflagTarget, setUnflagTarget] =
        useState<AdminTimeLogResponse | null>(null)

    const handleFlag = useCallback((log: AdminTimeLogResponse) => {
        setFlagTarget(log)
        setFlagReason('')
    }, [])

    const handleUnflag = useCallback((log: AdminTimeLogResponse) => {
        setUnflagTarget(log)
    }, [])

    function submitFlag() {
        if (!flagTarget) return
        const trimmed = flagReason.trim()
        if (!trimmed) {
            toast.error('Please provide a reason for flagging')
            return
        }
        flagMutation.mutate(
            { id: flagTarget.id, reason: trimmed },
            {
                onSettled: () => {
                    setFlagTarget(null)
                    setFlagReason('')
                },
            },
        )
    }

    function submitUnflag() {
        if (!unflagTarget) return
        unflagMutation.mutate(unflagTarget.id, {
            onSettled: () => setUnflagTarget(null),
        })
    }

    const columns = useMemo(
        () =>
            getTimeLogColumns({
                onFlag: handleFlag,
                onUnflag: handleUnflag,
            }),
        [handleFlag, handleUnflag],
    )

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle>Time Logs</CardTitle>
                                {!isLoading && logs.length > 0 && (
                                    <>
                                        {flaggedCount > 0 ? (
                                            <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15">
                                                {flaggedCount} flagged
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
                                                All clear
                                            </Badge>
                                        )}
                                    </>
                                )}
                                {isFetching && (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                                )}
                            </div>
                            <CardDescription>
                                View and manage student clock-in/out records.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Loader2 className="size-7 animate-spin text-muted-foreground" />
                            <p className="mt-4 text-sm text-muted-foreground">
                                Loading time logs...
                            </p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10">
                                <Clock className="size-7 text-primary" />
                            </div>
                            <h2 className="mt-5 text-base font-semibold">
                                No time logs
                            </h2>
                            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
                                No clock-in records found. Time logs will appear
                                here once students begin clocking in.
                            </p>
                        </div>
                    ) : (
                        <DataTable
                            columns={columns}
                            data={logs}
                            searchPlaceholder="Search by name or email"
                            globalFilter
                            emptyMessage="No time logs match your search."
                            pageSize={10}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Flag dialog — prompts for a reason */}
            <Dialog
                open={flagTarget !== null}
                onOpenChange={(open) => {
                    if (!open && !flagMutation.isPending) {
                        setFlagTarget(null)
                        setFlagReason('')
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Flag as Suspicious</DialogTitle>
                        <DialogDescription>
                            Flag the time log for{' '}
                            <span className="font-medium text-foreground">
                                {flagTarget?.student_name}
                            </span>
                            . Please provide a reason.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter reason for flagging..."
                        value={flagReason}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                            setFlagReason(e.target.value)
                        }
                        rows={3}
                        className="resize-none"
                        maxLength={500}
                    />
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setFlagTarget(null)
                                setFlagReason('')
                            }}
                            disabled={flagMutation.isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submitFlag}
                            disabled={
                                flagMutation.isPending || !flagReason.trim()
                            }
                        >
                            {flagMutation.isPending && (
                                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            )}
                            Flag
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Unflag confirmation dialog */}
            <ConfirmDialog
                open={unflagTarget !== null}
                onOpenChange={(open) => {
                    if (!open && !unflagMutation.isPending)
                        setUnflagTarget(null)
                }}
                title="Unflag Time Log"
                description={`Are you sure you want to remove the suspicious flag from the time log for ${unflagTarget?.student_name}?`}
                confirmLabel="Unflag"
                onConfirm={submitUnflag}
                loading={unflagMutation.isPending}
            />
        </>
    )
}

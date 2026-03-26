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
import {
    Loader2,
    Clock,
    MapPin,
    Flag,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { LocationMap } from '@/components/ui/location-map'

const PAGE_SIZE = 10

export function TimeLogsManager() {
    const [page, setPage] = useState(1)
    const { data, isLoading, isFetching } = useTimeLogs({
        page,
        per_page: PAGE_SIZE,
    })

    const logs = data?.data ?? []
    const total = data?.total ?? 0
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
    const [locationTarget, setLocationTarget] =
        useState<AdminTimeLogResponse | null>(null)

    const handleFlag = useCallback((log: AdminTimeLogResponse) => {
        setFlagTarget(log)
        setFlagReason('')
    }, [])

    const handleUnflag = useCallback((log: AdminTimeLogResponse) => {
        setUnflagTarget(log)
    }, [])

    const handleViewLocation = useCallback((log: AdminTimeLogResponse) => {
        setLocationTarget(log)
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
                onViewLocation: handleViewLocation,
            }),
        [handleFlag, handleUnflag, handleViewLocation],
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
                        <>
                            <DataTable
                                columns={columns}
                                data={logs}
                                searchPlaceholder="Search by name or email"
                                globalFilter
                                emptyMessage="No time logs match your search."
                                pageSize={PAGE_SIZE}
                            />
                            {total > PAGE_SIZE && (
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-xs text-muted-foreground">
                                        {(page - 1) * PAGE_SIZE + 1}–
                                        {Math.min(page * PAGE_SIZE, total)} of{' '}
                                        {total}
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7"
                                            disabled={page <= 1}
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1),
                                                )
                                            }
                                        >
                                            <ChevronLeft className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-7 w-7"
                                            disabled={page * PAGE_SIZE >= total}
                                            onClick={() =>
                                                setPage((p) => p + 1)
                                            }
                                        >
                                            <ChevronRight className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
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

            {/* Location map dialog */}
            <Dialog
                open={locationTarget !== null}
                onOpenChange={(open) => {
                    if (!open) setLocationTarget(null)
                }}
            >
                <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
                    {locationTarget && (
                        <>
                            <LocationMap
                                latitude={locationTarget.latitude}
                                longitude={locationTarget.longitude}
                                radiusMeters={100}
                                className="h-56 w-full"
                            />
                            <div className="px-5 py-4 space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold">
                                            {locationTarget.student_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {locationTarget.student_email}
                                        </p>
                                    </div>
                                    {locationTarget.is_flagged ? (
                                        <Badge className="bg-red-500/15 text-red-500 hover:bg-red-500/15 shrink-0">
                                            <Flag className="mr-1 h-3 w-3" />
                                            Flagged
                                        </Badge>
                                    ) : (
                                        <Badge className="bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15 shrink-0">
                                            Clear
                                        </Badge>
                                    )}
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Clock In
                                        </p>
                                        <p className="tabular-nums font-medium">
                                            {new Date(
                                                locationTarget.entry_at,
                                            ).toLocaleString([], {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Clock Out
                                        </p>
                                        <p className="tabular-nums font-medium">
                                            {locationTarget.exit_at
                                                ? new Date(
                                                      locationTarget.exit_at,
                                                  ).toLocaleString([], {
                                                      month: 'short',
                                                      day: 'numeric',
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  })
                                                : 'Still on shift'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Distance
                                        </p>
                                        <p
                                            className={`tabular-nums font-medium ${locationTarget.distance_meters <= 100 ? 'text-emerald-500' : 'text-amber-500'}`}
                                        >
                                            {locationTarget.distance_meters <
                                            1000
                                                ? `${Math.round(locationTarget.distance_meters)} m`
                                                : `${(locationTarget.distance_meters / 1000).toFixed(1)} km`}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">
                                            Coordinates
                                        </p>
                                        <p className="tabular-nums font-medium text-xs">
                                            <MapPin className="inline h-3 w-3 mr-0.5 text-muted-foreground" />
                                            {locationTarget.latitude.toFixed(5)}
                                            ,{' '}
                                            {locationTarget.longitude.toFixed(
                                                5,
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {locationTarget.is_flagged &&
                                    locationTarget.flag_reason && (
                                        <div className="rounded-md bg-red-500/10 px-3 py-2">
                                            <p className="text-xs font-medium text-red-500">
                                                Flag reason
                                            </p>
                                            <p className="text-sm text-red-500/80">
                                                {locationTarget.flag_reason}
                                            </p>
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
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

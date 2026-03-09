import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { RefreshCw, LoaderCircle } from 'lucide-react'
import { DataTable } from '@/components/ui/data-table'
import { getStudentColumns } from '../columns/application-columns'
import { TranscriptDialog } from '../components/transcript-dialog'
import { useStudents } from '@/features/admin/student-management/student-context'
import type { Student } from '@/types/student'
import { getApplicationStatus, type ApplicationStatus } from '@/types/student'

const statusOrder: Record<ApplicationStatus, number> = {
    pending: 0,
    accepted: 1,
    rejected: 2,
}

export function Applications() {
    const { students, handleAccept, handleReject } = useStudents()
    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )
    const [syncing, setSyncing] = useState(false)

    const pendingCount = students.filter(
        (s) => getApplicationStatus(s) === 'pending',
    ).length

    async function handleSync() {
        setSyncing(true)
        try {
            await new Promise((r) => setTimeout(r, 800))
            toast.success('Applications synced')
        } catch {
            toast.error('Sync failed', {
                description: 'Could not sync applications. Please try again.',
            })
        } finally {
            setSyncing(false)
        }
    }

    const sorted = useMemo(
        () =>
            [...students].sort(
                (a, b) =>
                    statusOrder[getApplicationStatus(a)] -
                    statusOrder[getApplicationStatus(b)],
            ),
        [students],
    )

    const columns = useMemo(
        () =>
            getStudentColumns({
                onAccept: handleAccept,
                onReject: handleReject,
                onViewTranscript: setTranscriptStudent,
            }),
        [handleAccept, handleReject],
    )

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <CardTitle>Applications</CardTitle>
                                {pendingCount > 0 && (
                                    <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                                        {pendingCount} pending
                                    </Badge>
                                )}
                            </div>
                            <CardDescription>
                                Review transcripts and accept or reject
                                applicants
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            className="shrink-0"
                            disabled={syncing}
                            onClick={handleSync}
                        >
                            <RefreshCw
                                className={cn(
                                    'h-3.5 w-3.5',
                                    syncing && 'animate-spin',
                                )}
                            />
                            Sync
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="relative">
                    {syncing && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-lg bg-background/30 backdrop-blur-[2px]">
                            <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    <DataTable
                        columns={columns}
                        data={sorted}
                        searchPlaceholder="Search by name, ID, or email"
                        globalFilter
                        pageSize={10}
                        emptyMessage="No applications yet."
                    />
                </CardContent>
            </Card>
            <TranscriptDialog
                student={transcriptStudent}
                open={transcriptStudent !== null}
                onOpenChange={(open) => {
                    if (!open) setTranscriptStudent(null)
                }}
            />
        </>
    )
}

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RefreshCw, LoaderCircle, ArrowRight } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { DataTable } from "@/components/ui/data-table"
import { TranscriptDialog } from "./transcript-dialog"
import { getStudentColumns } from "./columns/student-columns"
import type { Student } from "@/types/student"
import { getApplicationStatus, type ApplicationStatus } from "@/types/student"

interface StudentApplicationsTableProps {
  students: Student[]
  onAccept: (studentId: number) => void
  onReject: (studentId: number) => void
  onSync: () => Promise<void>
}

const statusOrder: Record<ApplicationStatus, number> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
}

export function StudentApplicationsTable({ students, onAccept, onReject, onSync }: StudentApplicationsTableProps) {
  const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(null)
  const [syncing, setSyncing] = useState(false)
  const pendingCount = students.filter((s) => getApplicationStatus(s) === "pending").length

  async function handleSync() {
    setSyncing(true)
    try {
      await onSync()
    } finally {
      setSyncing(false)
    }
  }

  const sorted = useMemo(
    () => [...students].sort((a, b) => statusOrder[getApplicationStatus(a)] - statusOrder[getApplicationStatus(b)]),
    [students],
  )

  const columns = useMemo(
    () => getStudentColumns({ onAccept, onReject, onViewTranscript: setTranscriptStudent }),
    [onAccept, onReject],
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle>Student Applications</CardTitle>
                {pendingCount > 0 && (
                  <Badge className="bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
                    {pendingCount} pending
                  </Badge>
                )}
              </div>
              <CardDescription>
                Review and manage helpdesk assistant applications
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" disabled={syncing} onClick={handleSync}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />
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
            pageSize={999}
            emptyMessage="No applications yet."
          />
          <div className="mt-4 flex justify-center">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/applications">
                View more
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <TranscriptDialog
        student={transcriptStudent}
        open={!!transcriptStudent}
        onOpenChange={(open) => { if (!open) setTranscriptStudent(null) }}
      />
    </>
  )
}

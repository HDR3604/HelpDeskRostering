import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileText, Check, X, RefreshCw, LoaderCircle, ArrowRight } from "lucide-react"
import { Link } from "@tanstack/react-router"
import { TranscriptDialog } from "./transcript-dialog"
import type { Student } from "@/types/student"
import { getApplicationStatus, type ApplicationStatus } from "@/types/student"

interface StudentApplicationsTableProps {
  students: Student[]
  onAccept: (studentId: number) => void
  onReject: (studentId: number) => void
  onSync: () => Promise<void>
}

const statusVariant: Record<ApplicationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
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

  const sorted = [...students].sort(
    (a, b) => statusOrder[getApplicationStatus(a)] - statusOrder[getApplicationStatus(b)]
  )

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Student Applications</CardTitle>
              <CardDescription>
                Review and manage helpdesk assistant applications
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingCount > 0 && (
                <Badge variant="secondary">
                  {pendingCount} pending
                </Badge>
              )}
              <Button variant="outline" size="sm" disabled={syncing} onClick={handleSync}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" />
                Sync
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          {syncing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-b-lg bg-background/30 backdrop-blur-[2px]">
              <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead className="text-center">GPA</TableHead>
                <TableHead>Transcript</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((student) => {
                const status = getApplicationStatus(student)
                return (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-mono text-xs">{student.student_id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{student.first_name} {student.last_name}</p>
                        <p className="text-xs text-muted-foreground">{student.email_address}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{student.transcript_metadata.degree_programme}</p>
                        <p className="text-xs text-muted-foreground">Level {student.transcript_metadata.current_level}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-semibold">{student.transcript_metadata.overall_gpa.toFixed(2)}</span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setTranscriptStudent(student)}
                      >
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[status]} className="capitalize">
                        {status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={status !== "pending"}
                          onClick={() => onAccept(student.student_id)}
                        >
                          <Check className="mr-1 h-3 w-3" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          disabled={status !== "pending"}
                          onClick={() => onReject(student.student_id)}
                        >
                          <X className="mr-1 h-3 w-3" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
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

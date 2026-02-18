import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FileText, Check, X } from "lucide-react"
import { TranscriptDialog } from "./transcript-dialog"
import type { Student } from "@/types/student"
import { getApplicationStatus, type ApplicationStatus } from "@/types/student"

interface StudentApplicationsTableProps {
  students: Student[]
  onAccept: (studentId: number) => void
  onReject: (studentId: number) => void
}

const statusVariant: Record<ApplicationStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  accepted: "default",
  rejected: "destructive",
}

export function StudentApplicationsTable({ students, onAccept, onReject }: StudentApplicationsTableProps) {
  const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(null)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Student Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>GPA</TableHead>
                <TableHead>Transcript</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const status = getApplicationStatus(student)
                return (
                  <TableRow key={student.student_id}>
                    <TableCell className="font-mono text-xs">{student.student_id}</TableCell>
                    <TableCell className="font-medium">
                      {student.first_name} {student.last_name}
                    </TableCell>
                    <TableCell>{student.transcript_metadata.overall_gpa.toFixed(2)}</TableCell>
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

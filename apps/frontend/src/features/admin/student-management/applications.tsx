import { useState } from "react"
import { StudentApplicationsTable } from "../components/student-applications-table"
import { TranscriptDialog } from "../components/transcript-dialog"
import { useStudents } from "@/features/admin/student-management/student-context"
import type { Student } from "@/types/student"

export function Applications() {
  const { students, handleAccept, handleReject } = useStudents()
  const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(null)

  return (
    <div className="pt-4">
      <StudentApplicationsTable
        students={students}
        onAccept={handleAccept}
        onReject={handleReject}
        onSync={async () => {
          await new Promise((r) => setTimeout(r, 800))
        }}
        onViewTranscript={setTranscriptStudent}
      />

      <TranscriptDialog
        student={transcriptStudent}
        open={transcriptStudent !== null}
        onOpenChange={(open) => { if (!open) setTranscriptStudent(null) }}
      />
    </div>
  )
} 
import { useState, useMemo } from "react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { MOCK_HOURS_WORKED } from "@/lib/mock-data"
import type { Student } from "@/types/student"
import { TranscriptDialog } from "@/features/admin/components/transcript-dialog"
import { FileText } from "lucide-react"

function getTotalHours(student: Student): number {
  const record = MOCK_HOURS_WORKED.find((s) => 
    s.name === `${student.first_name} ${student.last_name}`
  )
  return record ? record.hours : 0
}

function getDegree(student: Student): string {
  return student.transcript_metadata.degree_programme
}

interface ActiveStudentsProps {
  students: Student[]
  onDeactivate: (student: Student) => void
  onActivate: (student: Student) => void
}

export function ActiveStudents({ students, onDeactivate, onActivate }: ActiveStudentsProps) {
  const [search, setSearch] = useState("")
  const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(null)  

const filtered = useMemo(() => {
  return students.filter((student) => {
    const fullName = `${student.first_name} ${student.last_name}`.toLowerCase()
    const nameAndId = fullName.includes(search.toLowerCase()) ||
      String(student.student_id).includes(search)
    return nameAndId
  })
}, [students, search])

  function handleDeactivate(student: Student) {
    onDeactivate(student)
    toast.success(`${student.first_name} ${student.last_name} deactivated`, {
      action: {
        label: "Undo",
        onClick: () => onActivate(student)
      },
    })
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center gap-2">
        <Input placeholder="Search name or ID" value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      </div>
      
      <div className="rounded-md border">
        <Table className="table-fixed w-full">
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Hours this Week</TableHead>
              <TableHead>Degree</TableHead>
              <TableHead>Transcript</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">No students found.</TableCell>
              </TableRow>
            ) : (
              filtered.map((student) => (
                <TableRow key={student.student_id}>
                  <TableCell className="text-sm">{student.student_id}</TableCell>
                  <TableCell>
                    <p className="font-medium"> {student.first_name} {student.last_name} </p>
                    <p className="text-xs neutral-500"> {student.email_address} </p>
                  </TableCell>
                  <TableCell>{getTotalHours(student)}</TableCell>
                  <TableCell>{getDegree(student)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => setTranscriptStudent(student)}>
                      <FileText /> 
                      View
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" 
                      onClick={() => handleDeactivate(student)}> 
                      Deactivate
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    
    <TranscriptDialog
      student={transcriptStudent}
      open={transcriptStudent !== null}
      onOpenChange={(open) => { if (!open) setTranscriptStudent(null) }}
    />
  </div>  
  )
}
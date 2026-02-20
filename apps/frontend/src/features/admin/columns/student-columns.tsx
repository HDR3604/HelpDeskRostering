import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, Check, X } from "lucide-react"
import type { Student } from "@/types/student"
import { getApplicationStatus, type ApplicationStatus } from "@/types/student"

const statusStyle: Record<ApplicationStatus, string> = {
  pending: "bg-amber-500/15 text-amber-500 hover:bg-amber-500/15",
  accepted: "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15",
  rejected: "bg-red-500/15 text-red-500 hover:bg-red-500/15",
}

const statusOrder: Record<ApplicationStatus, number> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
}

interface StudentColumnCallbacks {
  onAccept: (studentId: number) => void
  onReject: (studentId: number) => void
  onViewTranscript: (student: Student) => void
}

export function getStudentColumns({ onAccept, onReject, onViewTranscript }: StudentColumnCallbacks): ColumnDef<Student>[] {
  return [
    {
      accessorKey: "student_id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.student_id}</span>
      ),
    },
    {
      id: "name",
      accessorFn: (row) => `${row.first_name} ${row.last_name} ${row.email_address}`,
      header: "Name",
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.first_name} {row.original.last_name}</p>
          <p className="text-xs text-muted-foreground">{row.original.email_address}</p>
        </div>
      ),
    },
    {
      id: "programme",
      accessorFn: (row) => `${row.transcript_metadata.degree_programme} Level ${row.transcript_metadata.current_level}`,
      header: "Programme",
      cell: ({ row }) => (
        <div>
          <p className="text-sm">{row.original.transcript_metadata.degree_programme}</p>
          <p className="text-xs text-muted-foreground">Level {row.original.transcript_metadata.current_level}</p>
        </div>
      ),
    },
    {
      id: "gpa",
      accessorFn: (row) => row.transcript_metadata.overall_gpa,
      header: () => <div className="text-center">GPA</div>,
      cell: ({ row }) => (
        <div className="text-center">
          <span className="font-semibold">{row.original.transcript_metadata.overall_gpa.toFixed(2)}</span>
        </div>
      ),
    },
    {
      id: "transcript",
      enableSorting: false,
      header: "Transcript",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onViewTranscript(row.original)}
        >
          <FileText className="mr-1 h-3.5 w-3.5" />
          View
        </Button>
      ),
    },
    {
      id: "status",
      accessorFn: (row) => getApplicationStatus(row),
      header: "Status",
      sortingFn: (rowA, rowB) => {
        const a = statusOrder[getApplicationStatus(rowA.original)]
        const b = statusOrder[getApplicationStatus(rowB.original)]
        return a - b
      },
      cell: ({ row }) => {
        const status = getApplicationStatus(row.original)
        return (
          <Badge className={`capitalize ${statusStyle[status]}`}>
            {status}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => {
        const status = getApplicationStatus(row.original)
        return (
          <div className="flex justify-end gap-1">
            <Button
              variant="outline"
              size="xs"
              disabled={status !== "pending"}
              onClick={() => onAccept(row.original.student_id)}
            >
              <Check className="mr-1 h-3 w-3" />
              Accept
            </Button>
            <Button
              variant="outline"
              size="xs"
              disabled={status !== "pending"}
              onClick={() => onReject(row.original.student_id)}
            >
              <X className="mr-1 h-3 w-3" />
              Reject
            </Button>
          </div>
        )
      },
    },
  ]
}

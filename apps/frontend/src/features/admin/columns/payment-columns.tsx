import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import type { Student } from "@/types/student"
import { Trash2 } from "lucide-react"

export type PaymentEntry = {
  student: Student
  department: string
  period: string
  hours: number
  allocation: string
}

interface PaymentColumnCallbacks {
  onDelete: (entry: PaymentEntry) => void
  changeAllocation: (studentId: number, value: string) => void
  isEditing: boolean
}

export function getPaymentColumns({ onDelete, changeAllocation, isEditing }: PaymentColumnCallbacks): ColumnDef<PaymentEntry>[] {
  return [
    {
      id: "student_id",
      accessorFn: (row) => row.student.student_id,
      header: "Student ID",
      cell: ({ row }) => (<span className="text-sm">{row.original.student.student_id}</span>),
    },
    {
      id: "first_name",
      accessorFn: (row) => row.student.first_name,
      header: "First Name",
      cell: ({ row }) => (<span>{row.original.student.first_name}</span>),
    },
    {
      id: "last_name",
      accessorFn: (row) => row.student.last_name,
      header: "Last Name",  
      cell: ({ row }) => (<span>{row.original.student.last_name}</span>),
    },
    {
      id: "department",
      accessorKey: "department",
      header: "Department",
      cell: ({ row }) => (<span>{row.original.department}</span>),
    },
    {
      id: "period",
      accessorKey: "period",
      header: "Period",
      cell: ({ row }) => (<span>{row.original.period}</span>),
    },
    {
      id: "hours",
      accessorKey: "hours",
      header: "HRS",
      cell: ({ row }) => (<span>{row.original.hours}</span>),
    },
    {
      id: "rate",
      header: "$20.00/Hr.",
      cell: ({ row }) => (<span>$20.00</span>),
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => (<span className="font-semibold">${(row.original.hours * 20).toFixed(2)}</span>),
    },
    {
      id: "allocation",
      accessorKey: "allocation",
      header: "Allocation",
      cell: ({ row }) => isEditing ? (
        <input
          className="border rounded px-2 py-1 text-sm w-full"
          value={row.original.allocation}
          onChange={(e) => changeAllocation(row.original.student.student_id, e.target.value)}
        />
      ) : (<span>{row.original.allocation}</span>),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => onDelete(row.original)} 
          className={isEditing ? "visible" : "invisible"}>
          <Trash2 className="mr-1 h-3.5 w-3.5 hover:text-destructive" />
        </Button>
      ),
    },
  ]
}
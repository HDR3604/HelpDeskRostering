import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/data-table"
import { getPaymentColumns } from "../columns/payment-columns"
import { MOCK_STUDENTS } from "@/lib/mock-data"
import { getApplicationStatus } from "@/types/student"
import type { PaymentEntry } from "../columns/payment-columns"
import { MOCK_HOURS_WORKED } from "@/lib/mock-data"
import { PencilLine } from "lucide-react"
const MOCK_PAYMENT_TABLE: PaymentEntry[] = MOCK_STUDENTS
  .filter((s) => getApplicationStatus(s) === "accepted")
  .map((s) => {
    const hoursRecord = MOCK_HOURS_WORKED.find(
      (student) => student.name === `${s.first_name} ${s.last_name}`
    )
    return {
      student: s,
      department: s.transcript_metadata.degree_programme,
      period: "Jan - May 2025",
      hours: hoursRecord ? hoursRecord.hours : 0,
      allocation: "Helpdesk",
    }
  })

export function PaymentsCentre() {
  const [payments, setPayments] = useState<PaymentEntry[]>(MOCK_PAYMENT_TABLE)
  const [isEditing, setIsEditing] = useState(false)
  const [lastDeleted, setLastDeleted] = useState<PaymentEntry | null>(null)

  function handleDelete(entry: PaymentEntry) {
    setPayments((prev) =>
      prev.filter((p) => p.student.student_id !== entry.student.student_id)
    )
    setLastDeleted(entry)
  }

  function handleUndo() {
    if (!lastDeleted) return
    setPayments((prev) => [...prev, lastDeleted])
    setLastDeleted(null)
  }

  function handleAllocationChange(studentId: number, value: string) {
    setPayments((prev) =>
      prev.map((p) =>
        p.student.student_id === studentId ? { ...p, allocation: value } : p
      )
    )
  }

  const columns = useMemo(
    () => getPaymentColumns({ onDelete: handleDelete, changeAllocation: handleAllocationChange, isEditing }),
    [isEditing]
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center w-full">
        <p className="mt-2 text-muted-foreground">Manage student payments and transactions.</p>
          <div className="flex items-center gap-2">
          {isEditing && lastDeleted && (
            <Button variant="outline" size="lg" onClick={handleUndo}>
              Undo
            </Button>
          )}
          <Button
            variant={isEditing ? "default" : "outline"}
            size="lg"
            onClick={() => setIsEditing((prev) => !prev)}
          >
            {isEditing ? "Done" : "Edit"}
            <PencilLine />
          </Button>
        </div>
      </div>
      <DataTable
        columns={columns}
        data={payments}
        emptyMessage="No payment records found."
      />
    </div>
  )
}
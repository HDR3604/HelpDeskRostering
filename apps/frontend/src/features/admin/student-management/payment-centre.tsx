import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
import { getPaymentColumns } from '../columns/payment-columns'
import { MOCK_STUDENTS } from '@/lib/mock-data'
import { getApplicationStatus } from '@/types/student'
import type { PaymentEntry } from '../columns/payment-columns'
import { MOCK_HOURS_WORKED } from '@/lib/mock-data'
import { PencilLine } from 'lucide-react'

const MOCK_PAYMENT_TABLE: PaymentEntry[] = MOCK_STUDENTS.filter(
    (s) => getApplicationStatus(s) === 'accepted',
).map((s) => {
    const hoursRecord = MOCK_HOURS_WORKED.find(
        (student) => student.name === `${s.first_name} ${s.last_name}`,
    )
    return {
        student: s,
        department: s.transcript_metadata.degree_programme,
        period: 'Jan - May 2025',
        hours: hoursRecord ? hoursRecord.hours : 0,
        allocation: 'Helpdesk',
    }
})

export function PaymentsCentre() {
    const [payments, setPayments] = useState<PaymentEntry[]>(MOCK_PAYMENT_TABLE)
    const [isEditing, setIsEditing] = useState(false)
    const [deletedStack, setDeletedStack] = useState<PaymentEntry[]>([])

    function handleDelete(entry: PaymentEntry) {
        setPayments((prev) =>
            prev.filter(
                (p) => p.student.student_id !== entry.student.student_id,
            ),
        )
        setDeletedStack((prev) => [...prev, entry])
    }

    function handleUndo() {
        if (deletedStack.length === 0) return
        const last = deletedStack[deletedStack.length - 1]
        setPayments((prev) => [...prev, last])
        setDeletedStack((prev) => prev.slice(0, -1))
    }

    function handleAllocationChange(studentId: number, value: string) {
        setPayments((prev) =>
            prev.map((p) =>
                p.student.student_id === studentId
                    ? { ...p, allocation: value }
                    : p,
            ),
        )
    }

    const [search, setSearch] = useState('')
    const filtered = useMemo(() => {
        return payments.filter((entry) => {
            const fullName =
                `${entry.student.first_name} ${entry.student.last_name}`.toLowerCase()
            return (
                fullName.includes(search.toLowerCase()) ||
                String(entry.student.student_id).includes(search)
            )
        })
    }, [payments, search])

    const columns = useMemo(
        () =>
            getPaymentColumns({
                onDelete: handleDelete,
                changeAllocation: handleAllocationChange,
                isEditing,
            }),
        [isEditing],
    )

    return (
        <div className="space-y-4 pt-4">
            <div className="flex items-center justify-start">
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Search name or ID"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="max-w-sm"
                    />
                    <Button
                        variant={isEditing ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setIsEditing((prev) => !prev)}
                    >
                        {isEditing ? 'Done' : 'Edit'}
                        <PencilLine />
                    </Button>
                    {isEditing && deletedStack.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleUndo}
                        >
                            Undo
                        </Button>
                    )}
                </div>
            </div>
            <DataTable
                columns={columns}
                data={filtered}
                emptyMessage="No payment records found."
            />
        </div>
    )
}

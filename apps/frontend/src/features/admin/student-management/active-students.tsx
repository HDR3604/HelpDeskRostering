import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/ui/data-table'
import { getActiveStudentColumns } from '../columns/active-student-columns'
import { TranscriptDialog } from '@/features/admin/components/transcript-dialog'
import type { Student } from '@/types/student'

interface ActiveStudentsProps {
    students: Student[]
    onDeactivate: (student: Student) => void
    onActivate: (student: Student) => void
}

export function ActiveStudents({
    students,
    onDeactivate,
    onActivate,
}: ActiveStudentsProps) {
    const [transcriptStudent, setTranscriptStudent] = useState<Student | null>(
        null,
    )

    function handleDeactivate(student: Student) {
        onDeactivate(student)
        toast.success(
            `${student.first_name} ${student.last_name} deactivated`,
            {
                action: {
                    label: 'Undo',
                    onClick: () => onActivate(student),
                },
            },
        )
    }

    const columns = useMemo(
        () =>
            getActiveStudentColumns({
                onDeactivate: handleDeactivate,
                onViewTranscript: setTranscriptStudent,
            }),
        [],
    )

    return (
        <div>
            <DataTable
                columns={columns}
                data={students}
                searchPlaceholder="Search name or ID"
                searchColumnId="name"
                emptyMessage="No students found."
                pageSize={10}
            />
            <TranscriptDialog
                student={transcriptStudent}
                open={transcriptStudent !== null}
                onOpenChange={(open) => {
                    if (!open) setTranscriptStudent(null)
                }}
            />
        </div>
    )
}

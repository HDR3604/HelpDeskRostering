import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { DataTable } from '@/components/ui/data-table'
import { getDeactivatedStudentColumns } from '../columns/deactivated-student-columns'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { MOCK_SEMESTERS } from '@/lib/mock-data'
import type { Student } from '@/types/student'

const YEARS = [2026, 2025, 2024, 2023, 2022, 2021, 2020]

function getSemester(student: Student): string {
    const record = MOCK_SEMESTERS.find(
        (s) => s.name === `${student.first_name} ${student.last_name}`,
    )
    return record ? String(record.semester) : '1'
}

interface DeactivatedStudentsProps {
    students: Student[]
    onActivate: (student: Student) => void
    onDeactivate: (student: Student) => void
}

export function DeactivatedStudents({
    students,
    onActivate,
    onDeactivate,
}: DeactivatedStudentsProps) {
    const [yearFilter, setYearFilter] = useState('all')
    const [semesterFilter, setSemesterFilter] = useState('all')

    const filtered = useMemo(() => {
        return students.filter((student) => {
            const year =
                yearFilter === 'all' ||
                String(student.transcript_metadata.current_level) === yearFilter
            const semester =
                semesterFilter === 'all' ||
                getSemester(student) === semesterFilter
            return year && semester
        })
    }, [students, yearFilter, semesterFilter])

    function handleActivate(student: Student) {
        onActivate(student)
        toast.success(
            `${student.first_name} ${student.last_name} reactivated`,
            {
                action: {
                    label: 'Undo',
                    onClick: () => onDeactivate(student),
                },
            },
        )
    }

    const columns = useMemo(
        () => getDeactivatedStudentColumns({ onActivate: handleActivate }),
        [],
    )

    const toolbar = (
        <div className="flex items-center gap-2">
            <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-32">
                    <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {YEARS.map((year, index) => (
                        <SelectItem key={year} value={String(index + 1)}>
                            {year}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
                <SelectTrigger className="w-36">
                    <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                    <SelectItem value="3">Semester 3</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )

    return (
        <DataTable
            columns={columns}
            data={filtered}
            searchPlaceholder="Search name or ID"
            searchColumnId="name"
            toolbarSlot={toolbar}
            emptyMessage="No students found."
            pageSize={10}
        />
    )
}

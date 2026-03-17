import { createContext, useContext, useMemo } from 'react'
import {
    useStudents as useStudentsQuery,
    useAcceptStudent,
    useRejectStudent,
    useDeactivateStudent,
    useActivateStudent,
} from '@/lib/queries/students'
import type { Student } from '@/types/student'

type StudentContextValue = {
    students: Student[]
    activeStudents: Student[]
    deactivatedStudents: Student[]
    isLoading: boolean
    handleDeactivate: (student: Student) => void
    handleActivate: (student: Student) => void
    handleReject: (studentId: number) => void
    handleAccept: (studentId: number) => void
    refetch: () => void
    isRefetching: boolean
    isMutating: boolean
}

export const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: React.ReactNode }) {
    const {
        data: students = [],
        isLoading,
        isRefetching,
        refetch: refetchQuery,
    } = useStudentsQuery()

    const acceptMutation = useAcceptStudent()
    const rejectMutation = useRejectStudent()
    const deactivateMutation = useDeactivateStudent()
    const activateMutation = useActivateStudent()

    const activeStudents = useMemo(
        () => students.filter((s) => s.status === 'accepted'),
        [students],
    )

    const deactivatedStudents = useMemo(
        () => students.filter((s) => s.status === 'deactivated'),
        [students],
    )

    function handleDeactivate(student: Student) {
        deactivateMutation.mutate(student.student_id)
    }

    function handleActivate(student: Student) {
        activateMutation.mutate(student.student_id)
    }

    function handleAccept(studentId: number) {
        acceptMutation.mutate(studentId)
    }

    function handleReject(studentId: number) {
        rejectMutation.mutate(studentId)
    }

    function handleRefetch() {
        refetchQuery()
    }

    const isMutating =
        acceptMutation.isPending ||
        rejectMutation.isPending ||
        deactivateMutation.isPending ||
        activateMutation.isPending

    return (
        <StudentContext.Provider
            value={{
                students,
                activeStudents,
                deactivatedStudents,
                isLoading,
                handleDeactivate,
                handleActivate,
                handleReject,
                handleAccept,
                refetch: handleRefetch,
                isRefetching,
                isMutating,
            }}
        >
            {children}
        </StudentContext.Provider>
    )
}

export function useStudents() {
    const context = useContext(StudentContext)
    if (!context) {
        throw new Error('useStudents must be used inside a StudentProvider')
    }
    return context
}

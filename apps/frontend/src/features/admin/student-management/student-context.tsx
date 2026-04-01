import { createContext, useContext, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    useStudents as useStudentsQuery,
    useAcceptStudent,
    useRejectStudent,
    useDeactivateStudent,
    useActivateStudent,
    studentKeys,
} from '@/lib/queries/students'
import type { Student } from '@/types/student'

type StudentContextValue = {
    students: Student[]
    activeStudents: Student[]
    deactivatedStudents: Student[]
    isLoading: boolean
    handleDeactivate: (student: Student) => void
    handleActivate: (student: Student) => void
    handleReject: (studentId: number) => Promise<void>
    handleAccept: (studentId: number) => Promise<void>
    refetch: () => void
    isRefetching: boolean
    isMutating: boolean
}

export const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: React.ReactNode }) {
    const queryClient = useQueryClient()
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

    async function handleAccept(studentId: number) {
        await acceptMutation.mutateAsync(studentId).catch(() => {})
        await queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
    }

    async function handleReject(studentId: number) {
        await rejectMutation.mutateAsync(studentId).catch(() => {})
        await queryClient.invalidateQueries({ queryKey: studentKeys.lists() })
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

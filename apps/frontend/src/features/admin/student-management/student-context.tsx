import { createContext, useContext, useState, useMemo, useEffect } from 'react'
import { MOCK_STUDENTS } from '@/lib/mock-data'
import { getApplicationStatus } from '@/types/student'
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
}

export const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: React.ReactNode }) {
    const [students, setStudents] = useState<Student[]>([])
    const [deactivatedIds, setDeactivatedIds] = useState<Set<number>>(new Set())
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Simulate API fetch
        const timer = setTimeout(() => {
            setStudents(MOCK_STUDENTS)
            setIsLoading(false)
        }, 800)
        return () => clearTimeout(timer)
    }, [])

    const activeStudents = useMemo(
        () =>
            students.filter(
                (s) =>
                    getApplicationStatus(s) === 'accepted' &&
                    !deactivatedIds.has(s.student_id),
            ),
        [students, deactivatedIds],
    )

    const deactivatedStudents = useMemo(
        () => students.filter((s) => deactivatedIds.has(s.student_id)),
        [students, deactivatedIds],
    )

    function handleDeactivate(student: Student) {
        setDeactivatedIds((e) => {
            const updated = new Set(e)
            updated.add(student.student_id)
            return updated
        })
    }

    function handleActivate(student: Student) {
        setDeactivatedIds((e) => {
            const updated = new Set(e)
            updated.delete(student.student_id)
            return updated
        })
    }

    function handleAccept(studentId: number) {
        setStudents((prev) =>
            prev.map((s) =>
                s.student_id === studentId
                    ? {
                          ...s,
                          accepted_at: new Date().toISOString(),
                          rejected_at: null,
                      }
                    : s,
            ),
        )
    }

    function handleReject(studentId: number) {
        setStudents((prev) =>
            prev.map((s) =>
                s.student_id === studentId
                    ? {
                          ...s,
                          rejected_at: new Date().toISOString(),
                          accepted_at: null,
                      }
                    : s,
            ),
        )
    }

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

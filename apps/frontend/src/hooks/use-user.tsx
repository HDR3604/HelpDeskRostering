import * as React from 'react'
import type { Student } from '@/types/student'
import { MOCK_STUDENTS } from '@/lib/mock-data'
import { getRole, getEmail, getName } from '@/lib/auth'

type Role = 'admin' | 'student'

// TODO: Remove mock student data once student API is implemented
const MOCK_CURRENT_STUDENT = MOCK_STUDENTS.find(
    (s) => s.student_id === 816012345,
)!

type UserContextValue = {
    role: Role
    firstName: string | null
    lastName: string | null
    email: string | null
    /** @deprecated Mock data — will be replaced by API call */
    currentStudent: Student
    /** @deprecated Mock data — will be replaced by API call */
    currentStudentId: string
}

const UserContext = React.createContext<UserContextValue | null>(null)

function resolveInitialRole(): Role {
    if (typeof window === 'undefined') return 'admin'
    const tokenRole = getRole()
    if (tokenRole === 'admin' || tokenRole === 'student') return tokenRole
    return 'admin'
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const role = resolveInitialRole()
    const email = getEmail()
    const name = getName()

    const value = React.useMemo<UserContextValue>(
        () => ({
            role,
            firstName: name?.firstName ?? null,
            lastName: name?.lastName ?? null,
            email,
            currentStudent: MOCK_CURRENT_STUDENT,
            currentStudentId: String(MOCK_CURRENT_STUDENT.student_id),
        }),
        [role, name?.firstName, name?.lastName, email],
    )

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
    const ctx = React.useContext(UserContext)
    if (!ctx) throw new Error('useUser must be used within UserProvider')
    return ctx
}

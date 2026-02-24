import * as React from 'react'
import type { Student } from '@/types/student'
import { MOCK_STUDENTS } from '@/lib/mock-data'
import { getTokenPayload } from '../token'
import { ACCESS_TOKEN_KEY, STORAGE_PREF_KEY } from '../constants'
import type { JwtPayload } from '../types'

// TODO: Remove mock student data once student API is implemented
const MOCK_CURRENT_STUDENT = MOCK_STUDENTS.find(
    (s) => s.student_id === 816012345,
)!

type UserContextValue = {
    role: JwtPayload['role']
    firstName: string | null
    lastName: string | null
    email: string | null
    /** @deprecated Mock data — will be replaced by API call */
    currentStudent: Student
    /** @deprecated Mock data — will be replaced by API call */
    currentStudentId: string
}

const UserContext = React.createContext<UserContextValue | null>(null)

function buildUserValue(payload: JwtPayload | null): UserContextValue {
    return {
        role: payload?.role ?? 'admin',
        firstName: payload?.first_name ?? null,
        lastName: payload?.last_name ?? null,
        email: payload?.email ?? null,
        currentStudent: MOCK_CURRENT_STUDENT,
        currentStudentId: String(MOCK_CURRENT_STUDENT.student_id),
    }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [value, setValue] = React.useState<UserContextValue>(() =>
        buildUserValue(getTokenPayload()),
    )

    // Cross-tab sync: when another tab modifies localStorage (login/logout),
    // re-derive user state or redirect to sign-in if tokens were cleared.
    React.useEffect(() => {
        function onStorage(e: StorageEvent) {
            if (
                e.key === ACCESS_TOKEN_KEY ||
                e.key === STORAGE_PREF_KEY ||
                e.key === null
            ) {
                const payload = getTokenPayload()
                if (!payload) {
                    window.location.href = '/sign-in'
                    return
                }
                setValue(buildUserValue(payload))
            }
        }
        window.addEventListener('storage', onStorage)
        return () => window.removeEventListener('storage', onStorage)
    }, [])

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
    const ctx = React.useContext(UserContext)
    if (!ctx) throw new Error('useUser must be used within UserProvider')
    return ctx
}

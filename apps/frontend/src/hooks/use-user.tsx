import * as React from "react"
import type { Student } from "@/types/student"
import { MOCK_STUDENTS } from "@/lib/mock-data"

type Role = "admin" | "student"

const STORAGE_KEY = "ui-role"

// Mock student: Jane Doe (accepted, has schedule assignments)
const MOCK_CURRENT_STUDENT = MOCK_STUDENTS.find((s) => s.student_id === 816012345)!

type UserContextValue = {
  role: Role
  setRole: (role: Role) => void
  currentStudent: Student
  currentStudentId: string
}

const UserContext = React.createContext<UserContextValue | null>(null)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<Role>(() => {
    if (typeof window === "undefined") return "admin"
    return (localStorage.getItem(STORAGE_KEY) as Role) || "admin"
  })

  const setRole = React.useCallback((r: Role) => {
    localStorage.setItem(STORAGE_KEY, r)
    setRoleState(r)
  }, [])

  const value = React.useMemo<UserContextValue>(
    () => ({
      role,
      setRole,
      currentStudent: MOCK_CURRENT_STUDENT,
      currentStudentId: String(MOCK_CURRENT_STUDENT.student_id),
    }),
    [role, setRole],
  )

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
  const ctx = React.useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}

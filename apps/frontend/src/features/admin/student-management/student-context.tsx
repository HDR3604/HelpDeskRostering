import { createContext, useContext, useState } from "react"
import { MOCK_STUDENTS } from "@/lib/mock-data"
import { getApplicationStatus } from "@/types/student"
import type { Student } from "@/types/student"

type StudentContextValue = {
  students: Student[]
  activeStudents: Student[]
  deactivatedStudents: Student[]
  handleDeactivate: (student: Student) => void
  handleActivate: (student: Student) => void
  handleReject: (studentId: number) => void
  handleAccept: (studentId: number) => void
}

export const StudentContext = createContext<StudentContextValue | null>(null)

export function StudentProvider({ children }: { children: React.ReactNode }) {

const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS)
const [deactivatedIds, setDeactivatedIds] = useState<Set<number>>(new Set())

  const activeStudents = students.filter((student) => {
    const isAccepted = getApplicationStatus(student) === "accepted"
    const isDeactivated = deactivatedIds.has(student.student_id)
    return isAccepted && !isDeactivated
  })

  const deactivatedStudents = students.filter((student) => {
    return deactivatedIds.has(student.student_id)
  })

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
    let updatedStudents = [...students];

    let index = updatedStudents.findIndex(
      (s) => s.student_id === studentId);

    if (index === -1) { return; }

    let student = updatedStudents[index];
    student.rejected_at = null;
    student.accepted_at = new Date().toISOString();

    setStudents(updatedStudents);
  }
  
  function handleReject(studentId: number) {
    let updatedStudents = [...students];

    let index = updatedStudents.findIndex(
      (s) => s.student_id === studentId);

    if (index === -1) { return; }

    let student = updatedStudents[index];
    student.rejected_at = new Date().toISOString();
    student.accepted_at = null;

    setStudents(updatedStudents);
  }

  return (
    <StudentContext.Provider
      value={{
        students,
        activeStudents,
        deactivatedStudents,
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
    throw new Error("useStudents must be used inside a StudentProvider")
  }
  return context
}
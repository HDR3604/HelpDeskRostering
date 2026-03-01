import { createFileRoute } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { ActiveStudents } from "@/features/admin/student-management/active-students"
import { useContext } from "react"
import { StudentContext } from "@/features/admin/student-management/student-context"

export const Route = createFileRoute("/_app/active-students")({
  component: ActiveStudentsPage,
})

function ActiveStudentsPage() {
  useDocumentTitle("Active Students")

  const context = useContext(StudentContext)
  if (!context) throw Error
  const { activeStudents, handleDeactivate, handleActivate } = context
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Active Students</h2>
      <p className="mt-2 text-muted-foreground">View and deactivate student accounts.</p>
      <ActiveStudents students={activeStudents} onDeactivate={handleDeactivate} onActivate={handleActivate}/>
    </div>
  )
}
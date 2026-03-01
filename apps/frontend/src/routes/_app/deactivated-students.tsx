import { createFileRoute } from "@tanstack/react-router"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { DeactivatedStudents } from "@/features/admin/student-management/deactivated-students"
import { useStudents } from "@/features/admin/student-management/student-context"

export const Route = createFileRoute("/_app/deactivated-students")({
  component: DeactivatedStudentsPage,
})

function DeactivatedStudentsPage() {
  useDocumentTitle("Deactivated Students")
  const { deactivatedStudents, handleActivate, handleDeactivate } = useStudents()
  return (
    <div className="mx-auto max-w-7xl">
      <h2 className="text-2xl font-bold tracking-tight">Deactivated Students</h2>
      <p className="mt-2 text-muted-foreground">View and activate deactivated student accounts.</p>
      <DeactivatedStudents students={deactivatedStudents} onDeactivate={handleDeactivate} onActivate={handleActivate} />
    </div>
  )
}
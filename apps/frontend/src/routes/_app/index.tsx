import { createFileRoute } from "@tanstack/react-router"
import { useUser } from "@/hooks/use-user"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { AdminDashboard } from "@/features/admin/admin-dashboard"
import { AdminDashboardSkeleton } from "@/features/admin/skeletons/admin-dashboard-skeleton"
import { StudentDashboard } from "@/features/student/student-dashboard"

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
  pendingComponent: AdminDashboardSkeleton,
})

function DashboardPage() {
  const { role } = useUser()
  useDocumentTitle("Dashboard")

  if (role === "student") {
    return <StudentDashboard />
  }

  return <AdminDashboard />
}

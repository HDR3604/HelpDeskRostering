import { createFileRoute } from "@tanstack/react-router"
import { useUser } from "@/hooks/use-user"
import { AdminDashboard } from "@/features/admin/admin-dashboard"
import { StudentDashboard } from "@/features/student/student-dashboard"

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
})

function DashboardPage() {
  const { role } = useUser()

  if (role === "student") {
    return <StudentDashboard />
  }

  return <AdminDashboard />
}

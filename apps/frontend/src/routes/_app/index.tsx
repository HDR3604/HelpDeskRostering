import { createFileRoute } from "@tanstack/react-router"
import { useUser } from "@/hooks/use-user"
import { AdminDashboard } from "@/features/admin/admin-dashboard"
import { AdminDashboardSkeleton } from "@/features/admin/admin-dashboard-skeleton"
import { StudentDashboard } from "@/features/student/student-dashboard"

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export const Route = createFileRoute("/_app/")({
  loader: () => sleep(1500), // TODO: remove — fake delay for testing skeletons
  component: DashboardPage,
  pendingComponent: AdminDashboardSkeleton,
})

function DashboardPage() {
  const { role } = useUser()

  if (role === "student") {
    return <StudentDashboard />
  }

  return <AdminDashboard />
}

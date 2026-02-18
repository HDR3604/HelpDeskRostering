import { Card, CardContent } from "@/components/ui/card"
import { Clock, XCircle } from "lucide-react"
import { getApplicationStatus } from "@/types/student"
import type { Student } from "@/types/student"

interface ApplicationStatusBannerProps {
  student: Student
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

export function ApplicationStatusBanner({ student }: ApplicationStatusBannerProps) {
  const status = getApplicationStatus(student)

  if (status === "accepted") return null

  if (status === "pending") {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <CardContent className="flex items-start gap-3 pt-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
            <Clock className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-100">Application Under Review</p>
            <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200/80">
              Your application was submitted on {formatDate(student.created_at)}.
              You will be notified once a decision is made.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
      <CardContent className="flex items-start gap-3 pt-6">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
          <XCircle className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-red-900 dark:text-red-100">Application Not Accepted</p>
          <p className="mt-0.5 text-sm text-red-800 dark:text-red-200/80">
            Your application was reviewed on {formatDate(student.rejected_at!)}.
            Please contact the department for more information.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

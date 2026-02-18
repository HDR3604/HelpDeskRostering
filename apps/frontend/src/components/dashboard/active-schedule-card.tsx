import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"
import type { ScheduleResponse } from "@/types/schedule"

interface ActiveScheduleCardProps {
  schedule: ScheduleResponse | null
}

export function ActiveScheduleCard({ schedule }: ActiveScheduleCardProps) {
  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Active Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active schedule</p>
        </CardContent>
      </Card>
    )
  }

  const assignmentCount = schedule.assignments.length
  const uniqueStudents = new Set(schedule.assignments.map((a) => a.assistant_id)).size

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Active Schedule</CardTitle>
        <Badge variant="default" className="text-xs">Active</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-lg font-semibold">{schedule.title}</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>
            {schedule.effective_from}
            {schedule.effective_to ? ` — ${schedule.effective_to}` : ""}
          </span>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Assignments: </span>
            <span className="font-medium">{assignmentCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Students: </span>
            <span className="font-medium">{uniqueStudents}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

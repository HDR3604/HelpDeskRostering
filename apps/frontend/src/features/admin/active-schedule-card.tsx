import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Users, Layers } from "lucide-react"
import type { ScheduleResponse } from "@/types/schedule"

interface ActiveScheduleCardProps {
  schedule: ScheduleResponse | null
}

export function ActiveScheduleCard({ schedule }: ActiveScheduleCardProps) {
  if (!schedule) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Schedule</CardTitle>
          <CardDescription>No active schedule has been set</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Generate and activate a schedule to see it here.
          </p>
        </CardContent>
      </Card>
    )
  }

  const assignmentCount = schedule.assignments.length
  const uniqueStudents = new Set(schedule.assignments.map((a) => a.assistant_id)).size

  const stats = [
    { icon: Users, label: "Students", value: uniqueStudents },
    { icon: Layers, label: "Assignments", value: assignmentCount },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle>{schedule.title}</CardTitle>
            <CardDescription>Currently active schedule</CardDescription>
          </div>
          <Badge className="shrink-0 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">Active</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>
            {schedule.effective_from}
            {schedule.effective_to ? ` — ${schedule.effective_to}` : " onwards"}
          </span>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <stat.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-semibold leading-none">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

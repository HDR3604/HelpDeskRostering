import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CalendarDays, Layers, Clock } from "lucide-react"
import { formatDateRange, getScheduledHours } from "@/lib/format"
import type { Assignment, ScheduleResponse } from "@/types/schedule"

interface WeekSummaryCardProps {
  assignments: Assignment[]
  schedule: ScheduleResponse
}

export function WeekSummaryCard({ assignments, schedule }: WeekSummaryCardProps) {
  const totalShifts = assignments.length
  const totalHours = getScheduledHours(assignments)

  const stats = [
    { icon: Layers, label: "Shifts", value: totalShifts },
    { icon: Clock, label: "Hours", value: totalHours },
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Week Summary</CardTitle>
        <CardDescription>{schedule.title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span>{formatDateRange(schedule.effective_from, schedule.effective_to)}</span>
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

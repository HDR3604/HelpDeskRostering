import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock } from "lucide-react"
import { ALL_DAYS_FULL } from "@/lib/constants"
import { formatHour, getShiftDuration } from "@/lib/format"
import { getNextAssignment } from "../utils"
import type { Assignment } from "@/types/schedule"
import type { ShiftTemplate } from "@/types/shift-template"

interface NextShiftCardProps {
  assignments: Assignment[]
  shiftTemplates: ShiftTemplate[]
}

export function NextShiftCard({ assignments, shiftTemplates }: NextShiftCardProps) {
  const next = getNextAssignment(assignments)

  if (!next) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Shift</CardTitle>
          <CardDescription>No upcoming shifts scheduled</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const template = shiftTemplates.find((t) => t.id === next.shift_id)
  const shiftName = template?.name ?? "Shift"
  const duration = getShiftDuration(next.start, next.end)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Next Shift</CardTitle>
        <CardDescription>Your upcoming helpdesk shift</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">{shiftName}</p>
          <Badge className="bg-muted text-muted-foreground hover:bg-muted">{duration} hrs</Badge>
        </div>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>{ALL_DAYS_FULL[next.day_of_week]}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>{formatHour(next.start)} – {formatHour(next.end)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

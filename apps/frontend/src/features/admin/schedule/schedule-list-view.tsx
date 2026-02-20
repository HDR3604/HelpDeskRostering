import { CalendarDays, Plus, Users, Layers, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ScheduleResponse } from "@/types/schedule"

interface ScheduleListViewProps {
  schedules: ScheduleResponse[]
  onCreateNew: () => void
  onOpenSchedule: (scheduleId: string) => void
}

export function ScheduleListView({ schedules, onCreateNew, onOpenSchedule }: ScheduleListViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Schedule</h1>
          <p className="mt-1 text-muted-foreground">Create and manage weekly schedules.</p>
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create Schedule
        </Button>
      </div>

      {/* Schedule cards */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">No schedules yet. Create one to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((schedule) => {
            const uniqueStudents = new Set(schedule.assignments.map((a) => a.assistant_id)).size
            const status = schedule.is_active ? "active" : schedule.archived_at ? "archived" : "draft"

            return (
              <Card key={schedule.schedule_id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">{schedule.title}</CardTitle>
                    <Badge
                      variant={status === "active" ? "default" : "outline"}
                      className="shrink-0 capitalize"
                    >
                      {status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>
                      {schedule.effective_from}
                      {schedule.effective_to ? ` — ${schedule.effective_to}` : " onwards"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{uniqueStudents} students</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5" />
                      <span>{schedule.assignments.length} assignments</span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => onOpenSchedule(schedule.schedule_id)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit Schedule
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

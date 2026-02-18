import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, UserCheck, CalendarDays } from "lucide-react"

interface SummaryCardsProps {
  pendingCount: number
  acceptedCount: number
  scheduledThisWeekCount: number
}

export function SummaryCards({ pendingCount, acceptedCount, scheduledThisWeekCount }: SummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">Awaiting review</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Accepted Students</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{acceptedCount}</div>
          <p className="text-xs text-muted-foreground">Ready for scheduling</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Scheduled This Week</CardTitle>
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{scheduledThisWeekCount}</div>
          <p className="text-xs text-muted-foreground">Assigned to shifts</p>
        </CardContent>
      </Card>
    </div>
  )
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { Clock, UserCheck, CalendarDays, Users, TrendingUp, TrendingDown, Minus } from "lucide-react"

interface StatCard {
  title: string
  value: number
  description: string
  icon: React.ElementType
  trend?: { value: string; direction: "up" | "down" | "neutral" }
  iconClassName?: string
}

interface SummaryCardsProps {
  pendingCount: number
  acceptedCount: number
  scheduledThisWeekCount: number
  totalCount: number
}

export function SummaryCards({ pendingCount, acceptedCount, scheduledThisWeekCount, totalCount }: SummaryCardsProps) {
  const cards: StatCard[] = [
    {
      title: "Total Applicants",
      value: totalCount,
      description: "All-time applications",
      icon: Users,
      iconClassName: "bg-blue-500/10 text-blue-500",
      trend: { value: "+2 this week", direction: "up" },
    },
    {
      title: "Pending Review",
      value: pendingCount,
      description: "Awaiting decision",
      icon: Clock,
      iconClassName: "bg-amber-500/10 text-amber-500",
      trend: pendingCount > 0
        ? { value: `${pendingCount} need${pendingCount === 1 ? "s" : ""} action`, direction: "neutral" }
        : { value: "All reviewed", direction: "up" },
    },
    {
      title: "Accepted",
      value: acceptedCount,
      description: "Ready for scheduling",
      icon: UserCheck,
      iconClassName: "bg-emerald-500/10 text-emerald-500",
      trend: { value: `${totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0}% acceptance rate`, direction: "up" },
    },
    {
      title: "Scheduled This Week",
      value: scheduledThisWeekCount,
      description: "Assigned to shifts",
      icon: CalendarDays,
      iconClassName: "bg-violet-500/10 text-violet-500",
      trend: { value: `of ${acceptedCount} accepted`, direction: scheduledThisWeekCount >= acceptedCount ? "up" : "neutral" },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", card.iconClassName)}>
              <card.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight">{card.value}</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {card.trend && (
                <>
                  {card.trend.direction === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                  {card.trend.direction === "down" && <TrendingDown className="h-3 w-3 text-red-500" />}
                  {card.trend.direction === "neutral" && <Minus className="h-3 w-3 text-amber-500" />}
                  <span>{card.trend.value}</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

import { Clock, UserCheck, CalendarDays, Users } from 'lucide-react'
import { StatCard } from '@/components/ui/stat-card'

interface SummaryCardsProps {
    pendingCount: number
    acceptedCount: number
    scheduledThisWeekCount: number
    totalCount: number
}

export function SummaryCards({
    pendingCount,
    acceptedCount,
    scheduledThisWeekCount,
    totalCount,
}: SummaryCardsProps) {
    const acceptanceRate =
        totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0

    const cards = [
        {
            title: 'Total Applicants',
            value: String(totalCount),
            subtitle: 'All-time applications',
            icon: Users,
            iconClassName: 'bg-blue-500/10 text-blue-500',
        },
        {
            title: 'Pending Review',
            value: String(pendingCount),
            subtitle:
                pendingCount > 0
                    ? `${pendingCount} need${pendingCount === 1 ? 's' : ''} action`
                    : 'All reviewed',
            icon: Clock,
            iconClassName: 'bg-amber-500/10 text-amber-500',
        },
        {
            title: 'Accepted',
            value: String(acceptedCount),
            subtitle: `${acceptanceRate}% acceptance rate`,
            icon: UserCheck,
            iconClassName: 'bg-emerald-500/10 text-emerald-500',
        },
        {
            title: 'Scheduled This Week',
            value: String(scheduledThisWeekCount),
            subtitle: `of ${acceptedCount} accepted`,
            icon: CalendarDays,
            iconClassName: 'bg-violet-500/10 text-violet-500',
        },
    ]

    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <StatCard key={card.title} {...card} />
            ))}
        </div>
    )
}

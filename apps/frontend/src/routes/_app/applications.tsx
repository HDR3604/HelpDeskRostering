import { useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useStudents } from '@/features/admin/student-management/student-context'
import { getApplicationStatus } from '@/types/student'
import { Applications } from '@/features/admin/student-management/applications'

export const Route = createFileRoute('/_app/applications')({
    component: ApplicationsPage,
})

const STAT_CARDS = [
    {
        title: 'Total Applications',
        icon: FileText,
        iconClassName: 'bg-blue-500/10 text-blue-500',
    },
    {
        title: 'Pending Review',
        icon: Clock,
        iconClassName: 'bg-amber-500/10 text-amber-500',
    },
    {
        title: 'Accepted',
        icon: CheckCircle,
        iconClassName: 'bg-emerald-500/10 text-emerald-500',
    },
    {
        title: 'Rejected',
        icon: XCircle,
        iconClassName: 'bg-red-500/10 text-red-500',
    },
] as const

function StatCardsSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {STAT_CARDS.map((card) => (
                <Card key={card.title} className="gap-3 py-4">
                    <CardHeader className="flex flex-row items-center justify-between pb-0">
                        <CardTitle className="text-xs font-medium text-muted-foreground">
                            {card.title}
                        </CardTitle>
                        <div
                            className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-md',
                                card.iconClassName,
                            )}
                        >
                            <card.icon className="h-3.5 w-3.5" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-8 w-16" />
                        <Skeleton className="mt-1 h-3.5 w-28" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function TableSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-3.5 w-48" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    <Skeleton className="h-8 w-48" />
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function ApplicationsPage() {
    useDocumentTitle('Applications')
    const { students, isLoading } = useStudents()

    const stats = useMemo(() => {
        const total = students.length
        const pending = students.filter(
            (s) => getApplicationStatus(s) === 'pending',
        ).length
        const accepted = students.filter(
            (s) => getApplicationStatus(s) === 'accepted',
        ).length
        const rejected = students.filter(
            (s) => getApplicationStatus(s) === 'rejected',
        ).length
        return { total, pending, accepted, rejected }
    }, [students])

    const cardValues = useMemo(
        () => [
            {
                value: String(stats.total),
                subtitle: 'All time submissions',
            },
            {
                value: String(stats.pending),
                subtitle: 'Awaiting review',
            },
            {
                value: String(stats.accepted),
                subtitle: `${stats.total > 0 ? Math.round((stats.accepted / stats.total) * 100) : 0}% acceptance rate`,
            },
            {
                value: String(stats.rejected),
                subtitle: `${stats.total > 0 ? Math.round((stats.rejected / stats.total) * 100) : 0}% rejection rate`,
            },
        ],
        [stats],
    )

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Applications
                </h1>
                <p className="mt-1 text-muted-foreground">
                    Review and manage helpdesk assistant applications.
                </p>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <StatCardsSkeleton />
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {STAT_CARDS.map((card, i) => (
                            <Card key={card.title} className="gap-3 py-4">
                                <CardHeader className="flex flex-row items-center justify-between pb-0">
                                    <CardTitle className="text-xs font-medium text-muted-foreground">
                                        {card.title}
                                    </CardTitle>
                                    <div
                                        className={cn(
                                            'flex h-7 w-7 items-center justify-center rounded-md',
                                            card.iconClassName,
                                        )}
                                    >
                                        <card.icon className="h-3.5 w-3.5" />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold tracking-tight">
                                        {cardValues[i].value}
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                        {cardValues[i].subtitle}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {isLoading ? <TableSkeleton /> : <Applications />}
            </div>
        </div>
    )
}

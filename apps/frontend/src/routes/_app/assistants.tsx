import { useEffect, useMemo } from 'react'
import {
    Outlet,
    createFileRoute,
    Link,
    useNavigate,
    useRouterState,
} from '@tanstack/react-router'
import { useDocumentTitle } from '@/hooks/use-document-title'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { StatCard, StatCardSkeleton } from '@/components/ui/stat-card'
import {
    Users,
    GraduationCap,
    Clock,
    DollarSign,
    UserSearch,
} from 'lucide-react'
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip'
import { useStudents } from '@/features/admin/student-management/student-context'
import { HOURLY_RATE } from '@/features/admin/columns/payment-columns'

export const Route = createFileRoute('/_app/assistants')({
    component: AssistantsLayout,
})

const STAT_CARDS = [
    {
        title: 'Active Assistants',
        icon: Users,
        iconClassName: 'bg-emerald-500/10 text-emerald-500',
    },
    {
        title: 'Average GPA',
        icon: GraduationCap,
        iconClassName: 'bg-blue-500/10 text-blue-500',
    },
    {
        title: 'Hours This Period',
        icon: Clock,
        iconClassName: 'bg-violet-500/10 text-violet-500',
    },
    {
        title: 'Period Payroll',
        icon: DollarSign,
        iconClassName: 'bg-amber-500/10 text-amber-500',
    },
] as const

function StatCardsSkeleton() {
    return (
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            {STAT_CARDS.map((card) => (
                <StatCardSkeleton
                    key={card.title}
                    title={card.title}
                    icon={card.icon}
                    iconClassName={card.iconClassName}
                />
            ))}
        </div>
    )
}

export function TableSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-20" />
                        <Skeleton className="h-3.5 w-36" />
                    </div>
                    <Skeleton className="h-8 w-36" />
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

function AssistantsLayout() {
    useDocumentTitle('Assistants')
    const router = useRouterState()
    const navigate = useNavigate()
    const currentPath = router.location.pathname

    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                e.target instanceof HTMLSelectElement
            ) {
                return
            }
            if (e.metaKey || e.ctrlKey || e.altKey) return
            if (e.key === '1') {
                navigate({ to: '/assistants' })
            } else if (e.key === '2') {
                navigate({ to: '/assistants/payments' })
            }
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [navigate])

    const { activeStudents, deactivatedStudents, isLoading } = useStudents()

    const newToday = useMemo(() => {
        const today = new Date().toDateString()
        return activeStudents.filter(
            (s) =>
                s.accepted_at &&
                new Date(s.accepted_at).toDateString() === today,
        )
    }, [activeStudents])

    const stats = useMemo(() => {
        const activeCount = activeStudents.length
        const avgGpa =
            activeCount > 0
                ? activeStudents.reduce(
                      (sum, s) =>
                          sum + (s.transcript_metadata.overall_gpa ?? 0),
                      0,
                  ) / activeCount
                : 0
        const totalHours = 0 // TODO: integrate with time logging API
        const totalPayroll = totalHours * HOURLY_RATE
        return { activeCount, avgGpa, totalHours, totalPayroll }
    }, [activeStudents])

    const cardValues = useMemo(
        () => [
            {
                value: String(stats.activeCount),
                subtitle: `${deactivatedStudents.length} deactivated`,
            },
            {
                value: stats.avgGpa.toFixed(2),
                subtitle: 'Across active roster',
            },
            {
                value: String(stats.totalHours),
                subtitle: `${stats.activeCount} assistants scheduled`,
            },
            {
                value: `$${stats.totalPayroll.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                subtitle: `$${HOURLY_RATE.toFixed(2)}/hr rate`,
            },
        ],
        [stats, deactivatedStudents.length],
    )

    const activeTab = currentPath.endsWith('/payments') ? 'payments' : 'team'

    return (
        <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                        Assistants
                    </h1>
                    <p className="mt-1 text-muted-foreground">
                        Manage helpdesk assistants, allocations, and payments.
                    </p>
                </div>
                <Tabs value={activeTab}>
                    <TabsList variant="line">
                        <TabsTrigger value="team" asChild>
                            <Link to="/assistants">
                                <UserSearch className="h-4 w-4" />
                                {newToday.length > 0 ? (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex items-center gap-1.5">
                                                Team
                                                <span className="relative flex h-2 w-2">
                                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                                                </span>
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p className="font-medium">
                                                {newToday.length} new today
                                            </p>
                                            {newToday.slice(0, 3).map((s) => (
                                                <p
                                                    key={s.student_id}
                                                    className="text-xs text-muted-foreground"
                                                >
                                                    {s.first_name} {s.last_name}
                                                </p>
                                            ))}
                                            {newToday.length > 3 && (
                                                <p className="text-xs text-muted-foreground">
                                                    + {newToday.length - 3} more
                                                </p>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                ) : (
                                    'Team'
                                )}
                                <kbd className="ml-1 hidden rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground/70 sm:inline-block">
                                    1
                                </kbd>
                            </Link>
                        </TabsTrigger>
                        <TabsTrigger value="payments" asChild>
                            <Link to="/assistants/payments">
                                <DollarSign className="h-4 w-4" />
                                Payroll
                                <kbd className="ml-1 hidden rounded border bg-background px-1 py-0.5 font-mono text-[10px] text-muted-foreground/70 sm:inline-block">
                                    2
                                </kbd>
                            </Link>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <StatCardsSkeleton />
                ) : (
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                        {STAT_CARDS.map((card, i) => (
                            <StatCard
                                key={card.title}
                                title={card.title}
                                value={cardValues[i].value}
                                subtitle={cardValues[i].subtitle}
                                icon={card.icon}
                                iconClassName={card.iconClassName}
                            />
                        ))}
                    </div>
                )}

                {isLoading ? <TableSkeleton /> : <Outlet />}
            </div>
        </div>
    )
}

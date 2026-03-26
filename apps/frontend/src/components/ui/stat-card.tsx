import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface StatCardProps {
    title: string
    value: string
    subtitle: string
    icon: React.ElementType
    iconClassName?: string
    href?: string
}

export function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconClassName,
    href,
}: StatCardProps) {
    const card = (
        <Card
            className={cn(
                'gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3',
                href && 'transition-colors hover:bg-accent/50 cursor-pointer',
            )}
        >
            <CardHeader className="flex flex-row items-center justify-between px-0 pb-0">
                <CardTitle className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {title}
                </CardTitle>
                <div
                    className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7',
                        iconClassName,
                    )}
                >
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="text-xl font-bold tracking-tight sm:text-2xl">
                    {value}
                </div>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground sm:text-xs">
                    {subtitle}
                </p>
            </CardContent>
        </Card>
    )

    if (href) {
        return (
            <Link to={href} className="no-underline">
                {card}
            </Link>
        )
    }

    return card
}

export function StatCardSkeleton({
    title,
    icon: Icon,
    iconClassName,
}: Pick<StatCardProps, 'title' | 'icon' | 'iconClassName'>) {
    return (
        <Card className="gap-1.5 px-3 py-2.5 sm:gap-2 sm:px-4 sm:py-3">
            <CardHeader className="flex flex-row items-center justify-between px-0 pb-0">
                <CardTitle className="truncate text-[11px] font-medium text-muted-foreground sm:text-xs">
                    {title}
                </CardTitle>
                <div
                    className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md sm:h-7 sm:w-7',
                        iconClassName,
                    )}
                >
                    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Skeleton className="h-7 w-12 sm:h-8 sm:w-16" />
                <Skeleton className="mt-1 h-3 w-20 sm:h-3.5 sm:w-28" />
            </CardContent>
        </Card>
    )
}

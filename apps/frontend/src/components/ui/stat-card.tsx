import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export interface StatCardProps {
    title: string
    value: string
    subtitle: string
    icon: React.ElementType
    iconClassName?: string
}

export function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    iconClassName,
}: StatCardProps) {
    return (
        <Card className="gap-2 px-4 py-3">
            <CardHeader className="flex flex-row items-center justify-between px-0 pb-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div
                    className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md',
                        iconClassName,
                    )}
                >
                    <Icon className="h-3.5 w-3.5" />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="text-2xl font-bold tracking-tight">{value}</div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    {subtitle}
                </p>
            </CardContent>
        </Card>
    )
}

export function StatCardSkeleton({
    title,
    icon: Icon,
    iconClassName,
}: Pick<StatCardProps, 'title' | 'icon' | 'iconClassName'>) {
    return (
        <Card className="gap-2 px-4 py-3">
            <CardHeader className="flex flex-row items-center justify-between px-0 pb-0">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div
                    className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-md',
                        iconClassName,
                    )}
                >
                    <Icon className="h-3.5 w-3.5" />
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-1 h-3.5 w-28" />
            </CardContent>
        </Card>
    )
}

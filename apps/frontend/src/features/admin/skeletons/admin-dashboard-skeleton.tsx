import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function AdminDashboardSkeleton() {
    return (
        <div className="mx-auto max-w-7xl space-y-6">
            {/* Page header */}
            <div>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="mt-2 h-4 w-80" />
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-9 w-16" />
                            <Skeleton className="mt-2 h-3 w-28" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Today's Shifts / Activity / Desk Coverage grid */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="flex flex-col">
                        <CardHeader>
                            <Skeleton className="h-5 w-28" />
                            <Skeleton className="h-4 w-36" />
                        </CardHeader>
                        <CardContent className="flex-1">
                            <div className="space-y-1.5">
                                {Array.from({ length: 3 }).map((_, j) => (
                                    <div
                                        key={j}
                                        className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                                    >
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="flex-1 space-y-1">
                                            <Skeleton className="h-4 w-28" />
                                            <Skeleton className="h-3 w-20" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Mini weekly schedule */}
            <Card>
                <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <Skeleton className="h-5 w-40" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-8 w-16 rounded-md" />
                    </div>
                    <div className="flex gap-4">
                        <Skeleton className="h-3.5 w-32" />
                        <Skeleton className="h-3.5 w-20" />
                        <Skeleton className="h-3.5 w-24" />
                    </div>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-48 w-full rounded-md" />
                </CardContent>
            </Card>

            {/* Student Applications */}
            <div className="space-y-3">
                <div>
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="mt-1 h-4 w-64" />
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={i}
                                    className="flex items-center gap-4"
                                >
                                    <Skeleton className="h-4 w-32 flex-1" />
                                    <Skeleton className="h-4 w-28" />
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                    <Skeleton className="h-7 w-16 rounded-md" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

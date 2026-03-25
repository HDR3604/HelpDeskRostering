import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export function ScheduleListSkeleton() {
    return (
        <div className="mx-auto max-w-7xl flex flex-col gap-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-8 w-36" />
                    <Skeleton className="mt-2 h-4 w-56" />
                </div>
                <Skeleton className="h-8 w-32 rounded-md" />
            </div>

            {/* Active schedule card */}
            <Card>
                <div className="flex items-center gap-3 px-6 py-4">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-5 w-14 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-64" />
                    </div>
                </div>
            </Card>

            {/* Insights row */}
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6 sm:gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex items-center gap-3 rounded-xl border bg-card px-3 py-3"
                    >
                        <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                        <div className="space-y-1">
                            <Skeleton className="h-3 w-14" />
                            <Skeleton className="h-4 w-10" />
                        </div>
                    </div>
                ))}
            </div>

            {/* Grid: Weekly overview + charts */}
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
                {/* Weekly overview */}
                <Card>
                    <CardHeader>
                        <Skeleton className="h-5 w-36" />
                        <Skeleton className="h-4 w-52" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-64 w-full rounded-md" />
                    </CardContent>
                </Card>

                {/* Stacked charts */}
                <div className="flex flex-col gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-3 w-40" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[140px] w-full rounded-md" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-44" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-[120px] w-full rounded-md" />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Schedule tables */}
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-6 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-52" />
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex items-center gap-4">
                                <Skeleton className="h-4 w-36 flex-1" />
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-8" />
                                <Skeleton className="h-4 w-8" />
                                <Skeleton className="h-6 w-14 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

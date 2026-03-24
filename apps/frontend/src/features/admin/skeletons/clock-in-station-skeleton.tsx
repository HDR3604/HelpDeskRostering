import { Skeleton } from '@/components/ui/skeleton'

export function ClockInStationSkeleton() {
    return (
        <div className="mx-auto max-w-4xl space-y-6">
            {/* Page header */}
            <div>
                <Skeleton className="h-8 w-44" />
                <Skeleton className="mt-2 h-4 w-72" />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                {/* QR area */}
                <div className="flex flex-col items-center gap-6 rounded-xl border bg-card p-8">
                    <Skeleton className="h-[320px] w-[320px] rounded-full" />
                    <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-8 w-48" />
                        <Skeleton className="h-4 w-24" />
                    </div>
                </div>

                {/* Activity sidebar */}
                <div className="rounded-xl border bg-card">
                    <div className="border-b px-4 py-3 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-40" />
                    </div>
                    <div className="space-y-1 p-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div
                                key={i}
                                className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                            >
                                <Skeleton className="h-7 w-7 rounded-full" />
                                <div className="flex-1 space-y-1">
                                    <Skeleton className="h-3.5 w-24" />
                                    <Skeleton className="h-2.5 w-14" />
                                </div>
                                <Skeleton className="h-3 w-8" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

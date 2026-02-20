import { Skeleton } from "@/components/ui/skeleton"

export function ScheduleEditorSkeleton() {
  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <Skeleton className="h-8 w-8 rounded-md shrink-0 mt-0.5" />
            <div className="min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-1.5">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid + Pool */}
      <div className="flex items-start gap-0 sm:gap-3">
        {/* Grid area */}
        <div className="flex-1 min-w-0 rounded-lg sm:rounded-xl border bg-card overflow-hidden">
          <div
            className="grid grid-cols-[2.5rem_repeat(5,1fr)] sm:grid-cols-[4.5rem_repeat(5,1fr)]"
          >
            {/* Day headers */}
            <div className="border-b border-border/60 py-3" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-center border-b border-border/60 py-3"
              >
                <Skeleton className="h-3 w-6" />
              </div>
            ))}

            {/* Time rows */}
            {Array.from({ length: 4 }).map((_, row) => (
              <>
                <div key={`gutter-${row}`} className="flex items-start justify-end border-b border-r border-border/60 pr-1.5 sm:pr-3 pt-2">
                  <Skeleton className="h-3 w-8" />
                </div>
                {Array.from({ length: 5 }).map((_, col) => (
                  <div
                    key={`cell-${row}-${col}`}
                    className="border-b border-border/60 p-0.5 sm:p-1.5"
                  >
                    <div className="space-y-1">
                      <Skeleton className="h-6 w-full rounded" />
                      <Skeleton className="h-6 w-3/4 rounded" />
                    </div>
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>

        {/* Student pool sidebar */}
        <div className="hidden sm:flex w-64 shrink-0 flex-col rounded-xl border bg-card">
          <div className="border-b px-3 py-2.5">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5 rounded" />
              <Skeleton className="h-4 w-16 flex-1" />
              <Skeleton className="h-3 w-8" />
            </div>
          </div>
          <div className="px-3 pt-2.5 pb-2">
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
          <div className="px-1.5 pb-2 space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

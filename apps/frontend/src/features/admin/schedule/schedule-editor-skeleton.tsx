import { Fragment } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// Varied chip counts per cell to look realistic
const CHIP_COUNTS = [
  [2, 1, 2, 1, 0],
  [1, 2, 0, 2, 1],
  [0, 1, 1, 0, 2],
  [1, 0, 2, 1, 1],
]

export function ScheduleEditorSkeleton() {
  return (
    <div className="mx-auto max-w-7xl flex flex-col gap-5">
      {/* Toolbar */}
      <div className="shrink-0 pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-2 sm:gap-3 min-w-0">
            <Skeleton className="h-8 w-8 rounded-md shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Skeleton className="h-6 sm:h-7 w-40 sm:w-52" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-1 h-4 w-48 sm:w-72" />
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2">
              <Skeleton className="h-8 w-[5.5rem] rounded-lg" />
              <Skeleton className="h-8 w-[5.5rem] rounded-lg" />
              <Skeleton className="h-8 w-[5.5rem] rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Grid + Pool */}
      <div className="flex items-start gap-0 sm:gap-3">
        {/* Grid area */}
        <div className="flex-1 min-w-0 overflow-x-auto sm:overflow-x-hidden rounded-lg sm:rounded-xl border bg-card">
          <div className="grid grid-cols-[2.5rem_repeat(5,1fr)] sm:grid-cols-[4.5rem_repeat(5,1fr)] h-fit select-none">
            {/* Day header row */}
            <div className="sticky top-0 left-0 z-30 border-b border-border/60 bg-card" />
            {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, idx) => (
              <div
                key={day}
                className={cn(
                  "sticky top-0 z-20 flex items-center justify-center border-b border-border/60 bg-card py-2.5 sm:py-3.5",
                  idx > 0 && "border-l border-border/60",
                )}
              >
                <Skeleton className="h-3 w-4 sm:w-7" />
              </div>
            ))}

            {/* Time slot rows */}
            {CHIP_COUNTS.map((row, rowIdx) => (
              <Fragment key={rowIdx}>
                {/* Time gutter */}
                <div className="sticky left-0 z-10 flex items-start justify-end border-b border-r border-border/60 bg-card pr-1.5 sm:pr-3 pt-2">
                  <Skeleton className="h-3 w-5 sm:w-10" />
                </div>

                {/* Day cells */}
                {row.map((chipCount, dayIdx) => (
                  <div
                    key={`${rowIdx}-${dayIdx}`}
                    className={cn(
                      "border-b border-border/60 p-0.5 sm:p-1.5",
                      dayIdx > 0 && "border-l border-border/60",
                    )}
                  >
                    <div className="rounded-md">
                      {/* Staffing indicator */}
                      <div className="flex items-center justify-end px-0.5 sm:px-1 pt-0.5 pb-0.5">
                        <Skeleton className="h-2 w-4" />
                      </div>

                      {chipCount > 0 ? (
                        <div className="flex flex-col gap-0.5 sm:gap-1 px-0.5 pb-0.5 sm:pb-1">
                          {Array.from({ length: chipCount }).map((_, i) => (
                            <Skeleton
                              key={i}
                              className="h-5 sm:h-6 w-full rounded"
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center pb-1">
                          <span className="text-[9px] text-muted-foreground/30">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>

        {/* Student pool sidebar — desktop only */}
        <div className="hidden sm:block sticky top-6 self-start">
          <div className="flex w-64 shrink-0 flex-col rounded-xl border bg-card overflow-hidden">
            {/* Header */}
            <div className="shrink-0 border-b px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-3.5 rounded shrink-0" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-8 shrink-0 ml-auto" />
                <Skeleton className="h-6 w-6 rounded shrink-0 -mr-1" />
              </div>
            </div>

            {/* Search */}
            <div className="shrink-0 px-3 pt-2.5 pb-2">
              <Skeleton className="h-8 w-full rounded-md" />
            </div>

            {/* Student chips — match real pool chip layout: dot + name + hours */}
            <div className="px-1.5 pb-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 rounded-md px-2.5 py-1.5">
                  <Skeleton className="h-2 w-2 shrink-0 rounded-full" />
                  <Skeleton className="h-3.5 flex-1 rounded" style={{ maxWidth: `${60 + (i % 3) * 15}%` }} />
                  <Skeleton className="h-3 w-8 shrink-0 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

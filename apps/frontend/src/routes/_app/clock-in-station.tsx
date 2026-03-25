import { createFileRoute, redirect } from '@tanstack/react-router'
import { ClockInStation } from '@/features/admin/clock-in-station'
import { ClockInStationSkeleton } from '@/features/admin/skeletons/clock-in-station-skeleton'
import { getTokenPayload } from '@/lib/auth'
import { queryClient } from '@/routes/__root'
import { getActiveClockInCode, listTimeLogs } from '@/lib/api/time-logs'
import { timeLogKeys } from '@/lib/queries/time-logs'

export const Route = createFileRoute('/_app/clock-in-station')({
    beforeLoad: () => {
        const payload = getTokenPayload()
        if (payload?.role !== 'admin') {
            throw redirect({ to: '/' })
        }

        const today = new Date().toISOString().slice(0, 10)
        queryClient.prefetchQuery({
            queryKey: timeLogKeys.activeCode(),
            queryFn: getActiveClockInCode,
            staleTime: 10_000,
        })
        queryClient.prefetchQuery({
            queryKey: timeLogKeys.list({ from: today, to: today }),
            queryFn: () =>
                listTimeLogs({ from: today, to: today, per_page: 100 }),
            staleTime: 5_000,
        })
    },
    component: ClockInStation,
    pendingComponent: ClockInStationSkeleton,
})

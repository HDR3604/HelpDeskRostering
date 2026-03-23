import { createFileRoute, redirect } from '@tanstack/react-router'
import { ClockInStation } from '@/features/admin/clock-in-station'
import { getTokenPayload } from '@/lib/auth'

export const Route = createFileRoute('/_app/clock-in-station')({
    beforeLoad: () => {
        const payload = getTokenPayload()
        if (payload?.role !== 'admin') {
            throw redirect({ to: '/' })
        }
    },
    component: ClockInStation,
})

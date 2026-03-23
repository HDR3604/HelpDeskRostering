import { createFileRoute, redirect } from '@tanstack/react-router'
import { AdminSettings } from '@/features/admin/admin-settings'
import { getTokenPayload } from '@/lib/auth'

export const Route = createFileRoute('/_app/settings/scheduler')({
    beforeLoad: () => {
        const payload = getTokenPayload()
        if (payload?.role !== 'admin') {
            throw redirect({ to: '/settings' })
        }
    },
    component: AdminSettings,
})

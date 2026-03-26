import { createFileRoute } from '@tanstack/react-router'
import { StudentSettings } from '@/features/student/student-settings'
import { AdminSettings } from '@/features/admin/admin-settings'
import { useUser } from '@/lib/auth/hooks/use-user'

export const Route = createFileRoute('/_app/settings/')({
    component: SettingsIndex,
})

function SettingsIndex() {
    const { role } = useUser()
    return role === 'student' ? <StudentSettings /> : <AdminSettings />
}

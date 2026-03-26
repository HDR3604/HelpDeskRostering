import { createFileRoute } from '@tanstack/react-router'
import { StudentSettings } from '@/features/student/student-settings'

export const Route = createFileRoute('/_app/settings/payment')({
    component: StudentSettings,
})

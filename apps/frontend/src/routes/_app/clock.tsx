import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { StudentClock } from '@/features/student/student-clock'
import { getTokenPayload } from '@/lib/auth'

const clockSearchSchema = z.object({
    code: z.string().optional(),
})

export const Route = createFileRoute('/_app/clock')({
    validateSearch: clockSearchSchema,
    beforeLoad: () => {
        const payload = getTokenPayload()
        if (payload?.role !== 'student') {
            throw redirect({ to: '/' })
        }
    },
    component: StudentClock,
})

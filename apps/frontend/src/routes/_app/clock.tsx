import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { StudentClock } from '@/features/student/student-clock'

const clockSearchSchema = z.object({
    code: z.string().optional(),
})

export const Route = createFileRoute('/_app/clock')({
    validateSearch: clockSearchSchema,
    component: StudentClock,
})

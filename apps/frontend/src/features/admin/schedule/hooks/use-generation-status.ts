import { useState, useEffect } from 'react'
import { isAxiosError } from 'axios'
import type { ScheduleResponse, GenerationStatusUpdate } from '@/types/schedule'
import { generateSchedule } from '@/lib/api/schedules'

interface GenerationFormValues {
    title: string
    effectiveFrom: string
    effectiveTo: string
    configId: string
    studentIds: string[]
}

export function useGenerationStatus(
    generationId: string | null,
    formValues: GenerationFormValues | null,
): {
    status: GenerationStatusUpdate | null
    schedule: ScheduleResponse | null
} {
    const [status, setStatus] = useState<GenerationStatusUpdate | null>(null)
    const [schedule, setSchedule] = useState<ScheduleResponse | null>(null)

    useEffect(() => {
        if (!generationId || !formValues) {
            setStatus(null)
            setSchedule(null)
            return
        }

        const abort = new AbortController()
        const startTime = Date.now()
        const MIN_ANIMATION_MS = 2500
        const pendingTimers: ReturnType<typeof setTimeout>[] = []

        const base: GenerationStatusUpdate = {
            id: generationId,
            status: 'pending',
            schedule_id: null,
            error_message: null,
            started_at: null,
            completed_at: null,
            progress: 0,
        }

        // Show pending immediately
        setStatus({ ...base })

        // Transition to running after a brief delay
        pendingTimers.push(
            setTimeout(() => {
                if (abort.signal.aborted) return
                setStatus((prev) =>
                    prev && prev.status === 'pending'
                        ? {
                              ...prev,
                              status: 'running',
                              started_at: new Date().toISOString(),
                              progress: 5,
                          }
                        : prev,
                )
            }, 500),
        )

        // Animate progress while waiting for the API
        const progressTimer = setInterval(() => {
            if (abort.signal.aborted) return
            setStatus((prev) => {
                if (!prev || prev.status !== 'running') return prev
                const next = Math.min(prev.progress + 8, 90)
                return { ...prev, progress: next }
            })
        }, 1500)

        // Defer final status until minimum animation time has elapsed
        function applyAfterMinDelay(fn: () => void) {
            const elapsed = Date.now() - startTime
            const remaining = Math.max(0, MIN_ANIMATION_MS - elapsed)
            if (remaining === 0) {
                fn()
            } else {
                // Force running state if still pending so the user sees progress
                setStatus((prev) =>
                    prev && prev.status === 'pending'
                        ? {
                              ...prev,
                              status: 'running',
                              started_at: new Date().toISOString(),
                              progress: 5,
                          }
                        : prev,
                )
                pendingTimers.push(
                    setTimeout(() => {
                        if (abort.signal.aborted) return
                        fn()
                    }, remaining),
                )
            }
        }

        // Fire the real API call
        generateSchedule({
            config_id: formValues.configId,
            title: formValues.title,
            effective_from: formValues.effectiveFrom,
            effective_to: formValues.effectiveTo || null,
            student_ids: formValues.studentIds,
        })
            .then((created) => {
                if (abort.signal.aborted) return
                applyAfterMinDelay(() => {
                    setStatus((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  status: 'completed',
                                  schedule_id: created.schedule_id,
                                  completed_at: new Date().toISOString(),
                                  progress: 100,
                              }
                            : prev,
                    )
                    setSchedule(created)
                })
            })
            .catch((err) => {
                if (abort.signal.aborted) return
                const isInfeasible =
                    isAxiosError(err) &&
                    err.response?.status === 422 &&
                    (err.response.data?.error as string)
                        ?.toLowerCase()
                        .includes('feasible')

                const errorMessage =
                    isAxiosError(err) && err.response?.data?.error
                        ? err.response.data.error
                        : 'An unexpected error occurred during schedule generation.'

                applyAfterMinDelay(() => {
                    setStatus((prev) =>
                        prev
                            ? {
                                  ...prev,
                                  status: isInfeasible
                                      ? 'infeasible'
                                      : 'failed',
                                  completed_at: new Date().toISOString(),
                                  error_message: errorMessage,
                                  progress: 0,
                              }
                            : prev,
                    )
                })
            })

        return () => {
            abort.abort()
            pendingTimers.forEach(clearTimeout)
            clearInterval(progressTimer)
        }
    }, [generationId, formValues])

    return { status, schedule }
}

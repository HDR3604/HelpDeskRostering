import { useState, useEffect } from 'react'
import { isAxiosError } from 'axios'
import type { GenerationStatusUpdate } from '@/types/schedule'
import { generateSchedule, getGenerationStatus } from '@/lib/api/schedules'

interface GenerationFormValues {
    title: string
    effectiveFrom: string
    effectiveTo: string
    configId: string
    studentIds: string[]
}

const POLL_INTERVAL_MS = 1000
const MIN_ANIMATION_MS = 2500

export function useGenerationStatus(
    generationId: string | null,
    formValues: GenerationFormValues | null,
): {
    status: GenerationStatusUpdate | null
} {
    const [status, setStatus] = useState<GenerationStatusUpdate | null>(null)

    useEffect(() => {
        if (!generationId || !formValues) {
            setStatus(null)
            return
        }

        const abort = new AbortController()
        const startTime = Date.now()
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

        // Animate progress while waiting
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

        // Step 1: Enqueue the generation
        generateSchedule({
            config_id: formValues.configId,
            title: formValues.title,
            effective_from: formValues.effectiveFrom,
            effective_to: formValues.effectiveTo || null,
            student_ids: formValues.studentIds,
        })
            .then((generation) => {
                if (abort.signal.aborted) return

                // Step 2: Poll for completion
                const poll = setInterval(async () => {
                    if (abort.signal.aborted) {
                        clearInterval(poll)
                        return
                    }

                    try {
                        const result = await getGenerationStatus(generation.id)

                        if (
                            result.status === 'completed' &&
                            result.schedule_id
                        ) {
                            clearInterval(poll)
                            applyAfterMinDelay(() => {
                                setStatus((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              status: 'completed',
                                              schedule_id: result.schedule_id,
                                              completed_at:
                                                  result.completed_at ??
                                                  new Date().toISOString(),
                                              progress: 100,
                                          }
                                        : prev,
                                )
                            })
                        } else if (result.status === 'failed') {
                            clearInterval(poll)
                            applyAfterMinDelay(() => {
                                setStatus((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              status: 'failed',
                                              error_message:
                                                  result.error_message ??
                                                  'Schedule generation failed.',
                                              completed_at:
                                                  result.completed_at ??
                                                  new Date().toISOString(),
                                              progress: 0,
                                          }
                                        : prev,
                                )
                            })
                        } else if (result.status === 'infeasible') {
                            clearInterval(poll)
                            applyAfterMinDelay(() => {
                                setStatus((prev) =>
                                    prev
                                        ? {
                                              ...prev,
                                              status: 'infeasible',
                                              error_message:
                                                  result.error_message ??
                                                  'No feasible schedule found.',
                                              completed_at:
                                                  result.completed_at ??
                                                  new Date().toISOString(),
                                              progress: 0,
                                          }
                                        : prev,
                                )
                            })
                        }
                    } catch {
                        // Polling error — keep trying
                    }
                }, POLL_INTERVAL_MS)

                // Clean up polling on unmount
                pendingTimers.push(
                    // Store poll interval ID for cleanup (using setTimeout wrapper)
                    (() => {
                        const cleanup = () => clearInterval(poll)
                        abort.signal.addEventListener('abort', cleanup)
                        return 0 as unknown as ReturnType<typeof setTimeout>
                    })(),
                )
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

    return { status }
}

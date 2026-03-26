import { useState, useEffect, useRef } from 'react'
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
const POLL_TIMEOUT_MS = 120_000 // Stop polling after 2 minutes

export function useGenerationStatus(
    generationId: string | null,
    formValues: GenerationFormValues | null,
): {
    status: GenerationStatusUpdate | null
} {
    const [status, setStatus] = useState<GenerationStatusUpdate | null>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        if (!generationId || !formValues) {
            setStatus(null)
            return
        }

        const abort = new AbortController()
        const startTime = Date.now()
        const timers: ReturnType<typeof setTimeout>[] = []

        function scheduleTimer(fn: () => void, ms: number) {
            const id = setTimeout(() => {
                if (abort.signal.aborted) return
                fn()
            }, ms)
            timers.push(id)
            return id
        }

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
        scheduleTimer(() => {
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
        }, 500)

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
                scheduleTimer(fn, remaining)
            }
        }

        function stopPolling() {
            if (pollRef.current) {
                clearInterval(pollRef.current)
                pollRef.current = null
            }
        }

        function applyTerminal(
            terminalStatus: 'completed' | 'failed' | 'infeasible',
            scheduleId: string | null,
            errorMessage: string | null,
            completedAt: string | null,
        ) {
            stopPolling()
            applyAfterMinDelay(() => {
                setStatus((prev) =>
                    prev
                        ? {
                              ...prev,
                              status: terminalStatus,
                              schedule_id: scheduleId,
                              error_message: errorMessage,
                              completed_at:
                                  completedAt ?? new Date().toISOString(),
                              progress:
                                  terminalStatus === 'completed' ? 100 : 0,
                          }
                        : prev,
                )
            })
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
                pollRef.current = setInterval(async () => {
                    if (abort.signal.aborted) {
                        stopPolling()
                        return
                    }

                    // Timeout guard
                    if (Date.now() - startTime > POLL_TIMEOUT_MS) {
                        applyTerminal(
                            'failed',
                            null,
                            'Schedule generation timed out. Check the schedule list for results.',
                            null,
                        )
                        return
                    }

                    try {
                        const result = await getGenerationStatus(generation.id)

                        if (
                            result.status === 'completed' &&
                            result.schedule_id
                        ) {
                            applyTerminal(
                                'completed',
                                result.schedule_id,
                                null,
                                result.completed_at,
                            )
                        } else if (result.status === 'failed') {
                            applyTerminal(
                                'failed',
                                null,
                                result.error_message ??
                                    'Schedule generation failed.',
                                result.completed_at,
                            )
                        } else if (result.status === 'infeasible') {
                            applyTerminal(
                                'infeasible',
                                null,
                                result.error_message ??
                                    'No feasible schedule found.',
                                result.completed_at,
                            )
                        }
                    } catch {
                        // Polling error — keep trying until timeout
                    }
                }, POLL_INTERVAL_MS)
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

                applyTerminal(
                    isInfeasible ? 'infeasible' : 'failed',
                    null,
                    errorMessage,
                    null,
                )
            })

        return () => {
            abort.abort()
            stopPolling()
            timers.forEach(clearTimeout)
            clearInterval(progressTimer)
        }
    }, [generationId, formValues])

    return { status }
}

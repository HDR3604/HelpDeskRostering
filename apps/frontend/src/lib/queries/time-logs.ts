import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    clockIn,
    clockOut,
    getMyClockInStatus,
    generateClockInCode,
    getActiveClockInCode,
    listTimeLogs,
    flagTimeLog,
    unflagTimeLog,
    type TimeLogFilters,
} from '@/lib/api/time-logs'
import { getApiErrorMessage } from '@/lib/error-messages'

// ── Key Factory ─────────────────────────────────────────────────────

export const timeLogKeys = {
    all: () => ['time-logs'] as const,
    status: () => [...timeLogKeys.all(), 'status'] as const,
    lists: () => [...timeLogKeys.all(), 'list'] as const,
    list: (params?: Record<string, unknown>) =>
        [...timeLogKeys.lists(), params] as const,
    activeCode: () => ['clock-in-codes', 'active'] as const,
}

// ── Query Hooks ─────────────────────────────────────────────────────

export function useClockInStatus() {
    return useQuery({
        queryKey: timeLogKeys.status(),
        queryFn: getMyClockInStatus,
        staleTime: 10_000,
        refetchInterval: 30_000,
    })
}

export function useTodayTimeLogs(options?: {
    fastPoll?: boolean
    enabled?: boolean
}) {
    const today = new Date().toISOString().slice(0, 10)
    return useQuery({
        queryKey: timeLogKeys.list({ from: today, to: today }),
        queryFn: () => listTimeLogs({ from: today, to: today, per_page: 100 }),
        staleTime: options?.fastPoll ? 2_000 : 15_000,
        refetchInterval: options?.fastPoll ? 3_000 : 30_000,
        enabled: options?.enabled ?? true,
    })
}

export function useTimeLogs(filters: TimeLogFilters = {}) {
    return useQuery({
        queryKey: timeLogKeys.list(filters as Record<string, unknown>),
        queryFn: () => listTimeLogs(filters),
        staleTime: 30_000,
    })
}

export function useActiveClockInCode() {
    return useQuery({
        queryKey: timeLogKeys.activeCode(),
        queryFn: getActiveClockInCode,
        staleTime: 10_000,
        retry: false,
    })
}

// ── Mutation Hooks ──────────────────────────────────────────────────

export function useClockIn() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: clockIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timeLogKeys.status() })
        },
        onError: (error) => {
            toast.error('Clock in failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useClockOut() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: clockOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: timeLogKeys.status() })
        },
        onError: (error) => {
            toast.error('Clock out failed', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useGenerateClockInCode() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: generateClockInCode,
        onSuccess: (newCode) => {
            queryClient.setQueryData(timeLogKeys.activeCode(), newCode)
        },
        onError: (error) => {
            toast.error('Failed to generate code', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useFlagTimeLog() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            flagTimeLog(id, reason),
        onSuccess: () => {
            toast.success('Time log flagged as suspicious')
            queryClient.invalidateQueries({ queryKey: timeLogKeys.lists() })
        },
        onError: (error) => {
            toast.error('Failed to flag time log', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useUnflagTimeLog() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => unflagTimeLog(id),
        onSuccess: () => {
            toast.success('Time log unflagged')
            queryClient.invalidateQueries({ queryKey: timeLogKeys.lists() })
        },
        onError: (error) => {
            toast.error('Failed to unflag time log', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

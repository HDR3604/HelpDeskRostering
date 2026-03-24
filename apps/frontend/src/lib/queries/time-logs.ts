import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ClockInStatus } from '@/types/time-log'
import {
    clockIn,
    clockOut,
    getMyClockInStatus,
    generateClockInCode,
    getActiveClockInCode,
    listTimeLogs,
} from '@/lib/api/time-logs'
import { getApiErrorMessage } from '@/lib/error-messages'

// ── Key Factory ─────────────────────────────────────────────────────

export const timeLogKeys = {
    all: () => ['time-logs'] as const,
    status: () => [...timeLogKeys.all(), 'status'] as const,
    list: (params?: Record<string, unknown>) =>
        [...timeLogKeys.all(), 'list', params] as const,
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

export function useTodayTimeLogs(options?: { fastPoll?: boolean }) {
    const today = new Date().toISOString().slice(0, 10)
    return useQuery({
        queryKey: timeLogKeys.list({ from: today, to: today }),
        queryFn: () => listTimeLogs({ from: today, to: today, per_page: 100 }),
        staleTime: options?.fastPoll ? 2_000 : 15_000,
        refetchInterval: options?.fastPoll ? 3_000 : 30_000,
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
            // Write the new code directly into cache so QR updates immediately
            queryClient.setQueryData(timeLogKeys.activeCode(), newCode)
        },
        onError: (error) => {
            toast.error('Failed to generate code', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    listPayments,
    generatePayments,
    processPayment,
    revertPayment,
    bulkProcessPayments,
    type PaymentResponse,
} from '@/lib/api/payments'
import { getApiErrorMessage } from '@/lib/error-messages'

// ── Key Factory ──────────────────────────────────────────────────────

export const paymentKeys = {
    all: () => ['payments'] as const,
    lists: () => [...paymentKeys.all(), 'list'] as const,
    list: (periodStart: string, periodEnd: string) =>
        [...paymentKeys.lists(), periodStart, periodEnd] as const,
}

// ── Query Hooks ──────────────────────────────────────────────────────

export function usePayments(periodStart: string, periodEnd: string) {
    return useQuery({
        queryKey: paymentKeys.list(periodStart, periodEnd),
        queryFn: () => listPayments(periodStart, periodEnd),
        staleTime: 30_000,
        enabled: !!periodStart && !!periodEnd,
    })
}

// ── Mutation Hooks ───────────────────────────────────────────────────

export function useGeneratePayments() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({
            periodStart,
            periodEnd,
        }: {
            periodStart: string
            periodEnd: string
        }) => generatePayments(periodStart, periodEnd),
        onSuccess: (data, variables) => {
            queryClient.setQueryData<PaymentResponse[]>(
                paymentKeys.list(variables.periodStart, variables.periodEnd),
                data,
            )
            toast.success(`Generated ${data.length} payment records`)
        },
        onError: (error) => {
            toast.error('Failed to generate payments', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useProcessPayment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: processPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
        },
        onError: (error) => {
            toast.error('Failed to process payment', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useRevertPayment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: revertPayment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
        },
        onError: (error) => {
            toast.error('Failed to revert payment', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useBulkProcessPayments() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: bulkProcessPayments,
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
            toast.success(
                `Processed ${data.length} payment${data.length > 1 ? 's' : ''}`,
            )
        },
        onError: (error) => {
            toast.error('Failed to process payments', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

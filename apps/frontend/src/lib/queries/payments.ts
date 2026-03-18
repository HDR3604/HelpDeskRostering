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

/**
 * Prefetch payments for a given period so navigation feels instant.
 */
export function usePrefetchPayments() {
    const queryClient = useQueryClient()

    return (periodStart: string, periodEnd: string) => {
        queryClient.prefetchQuery({
            queryKey: paymentKeys.list(periodStart, periodEnd),
            queryFn: () => listPayments(periodStart, periodEnd),
            staleTime: 30_000,
        })
    }
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
        onMutate: async (paymentId) => {
            await queryClient.cancelQueries({
                queryKey: paymentKeys.lists(),
            })

            const queries = queryClient.getQueriesData<PaymentResponse[]>({
                queryKey: paymentKeys.lists(),
            })

            for (const [key, data] of queries) {
                if (!data) continue
                queryClient.setQueryData<PaymentResponse[]>(
                    key,
                    data.map((p) =>
                        p.payment_id === paymentId
                            ? {
                                  ...p,
                                  processed_at: new Date().toISOString(),
                              }
                            : p,
                    ),
                )
            }

            return { queries }
        },
        onError: (error, _paymentId, context) => {
            if (context?.queries) {
                for (const [key, data] of context.queries) {
                    queryClient.setQueryData(key, data)
                }
            }
            toast.error('Failed to process payment', {
                description: getApiErrorMessage(error),
            })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
        },
    })
}

export function useRevertPayment() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: revertPayment,
        onMutate: async (paymentId) => {
            await queryClient.cancelQueries({
                queryKey: paymentKeys.lists(),
            })

            const queries = queryClient.getQueriesData<PaymentResponse[]>({
                queryKey: paymentKeys.lists(),
            })

            for (const [key, data] of queries) {
                if (!data) continue
                queryClient.setQueryData<PaymentResponse[]>(
                    key,
                    data.map((p) =>
                        p.payment_id === paymentId
                            ? { ...p, processed_at: null }
                            : p,
                    ),
                )
            }

            return { queries }
        },
        onError: (error, _paymentId, context) => {
            if (context?.queries) {
                for (const [key, data] of context.queries) {
                    queryClient.setQueryData(key, data)
                }
            }
            toast.error('Failed to revert payment', {
                description: getApiErrorMessage(error),
            })
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
        },
    })
}

export function useBulkProcessPayments() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: bulkProcessPayments,
        onMutate: async (paymentIds) => {
            await queryClient.cancelQueries({
                queryKey: paymentKeys.lists(),
            })

            const idSet = new Set(paymentIds)
            const queries = queryClient.getQueriesData<PaymentResponse[]>({
                queryKey: paymentKeys.lists(),
            })

            for (const [key, data] of queries) {
                if (!data) continue
                queryClient.setQueryData<PaymentResponse[]>(
                    key,
                    data.map((p) =>
                        idSet.has(p.payment_id)
                            ? {
                                  ...p,
                                  processed_at: new Date().toISOString(),
                              }
                            : p,
                    ),
                )
            }

            return { queries }
        },
        onError: (error, _paymentIds, context) => {
            if (context?.queries) {
                for (const [key, data] of context.queries) {
                    queryClient.setQueryData(key, data)
                }
            }
            toast.error('Failed to process payments', {
                description: getApiErrorMessage(error),
            })
        },
        onSuccess: (data) => {
            toast.success(
                `Processed ${data.length} payment${data.length !== 1 ? 's' : ''}`,
            )
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: paymentKeys.lists() })
        },
    })
}

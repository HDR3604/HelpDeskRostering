import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    listSchedulerConfigs,
    createSchedulerConfig,
    deleteSchedulerConfig,
    setDefaultSchedulerConfig,
    type CreateSchedulerConfigRequest,
} from '@/lib/api/scheduler-configs'
import { getApiErrorMessage } from '@/lib/error-messages'

export const schedulerConfigKeys = {
    all: () => ['scheduler-configs'] as const,
    list: () => [...schedulerConfigKeys.all(), 'list'] as const,
}

export function useSchedulerConfigs() {
    return useQuery({
        queryKey: schedulerConfigKeys.list(),
        queryFn: listSchedulerConfigs,
        staleTime: 5 * 60_000,
    })
}

export function useCreateSchedulerConfig() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (req: CreateSchedulerConfigRequest) =>
            createSchedulerConfig(req),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: schedulerConfigKeys.all(),
            })
            toast.success('Configuration created.')
        },
        onError: (error) => {
            toast.error('Failed to create configuration', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useDeleteSchedulerConfig() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: deleteSchedulerConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: schedulerConfigKeys.all(),
            })
            toast.success('Configuration deleted.')
        },
        onError: (error) => {
            toast.error('Failed to delete configuration', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

export function useSetDefaultSchedulerConfig() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: setDefaultSchedulerConfig,
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: schedulerConfigKeys.all(),
            })
            toast.success('Default configuration updated.')
        },
        onError: (error) => {
            toast.error('Failed to set default configuration', {
                description: getApiErrorMessage(error),
            })
        },
    })
}

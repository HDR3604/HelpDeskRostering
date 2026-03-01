import { useQuery } from '@tanstack/react-query'
import { listSchedulerConfigs } from '@/lib/api/scheduler-configs'

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

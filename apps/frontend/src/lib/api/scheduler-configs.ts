import { apiClient } from '@/lib/api-client'
import type { SchedulerConfig } from '@/types/scheduler-config'

export async function listSchedulerConfigs(): Promise<SchedulerConfig[]> {
    const { data } =
        await apiClient.get<SchedulerConfig[]>('/scheduler-configs')
    return data ?? []
}

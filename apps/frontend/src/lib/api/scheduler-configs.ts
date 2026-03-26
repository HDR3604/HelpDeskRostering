import { apiClient } from '@/lib/api-client'
import type { SchedulerConfig } from '@/types/scheduler-config'

export interface CreateSchedulerConfigRequest {
    name: string
    course_shortfall_penalty: number
    min_hours_penalty: number
    max_hours_penalty: number
    understaffed_penalty: number
    extra_hours_penalty: number
    max_extra_penalty: number
    baseline_hours_target: number
    solver_time_limit?: number | null
    solver_gap?: number | null
    log_solver_output: boolean
}

export type UpdateSchedulerConfigRequest = CreateSchedulerConfigRequest

export async function listSchedulerConfigs(): Promise<SchedulerConfig[]> {
    const { data } =
        await apiClient.get<SchedulerConfig[]>('/scheduler-configs')
    return data ?? []
}

export async function createSchedulerConfig(
    req: CreateSchedulerConfigRequest,
): Promise<SchedulerConfig> {
    const { data } = await apiClient.post<SchedulerConfig>(
        '/scheduler-configs',
        req,
    )
    return data
}

export async function updateSchedulerConfig(
    id: string,
    req: UpdateSchedulerConfigRequest,
): Promise<SchedulerConfig> {
    const { data } = await apiClient.put<SchedulerConfig>(
        `/scheduler-configs/${id}`,
        req,
    )
    return data
}

export async function deleteSchedulerConfig(id: string): Promise<void> {
    await apiClient.delete(`/scheduler-configs/${id}`)
}

export async function setDefaultSchedulerConfig(id: string): Promise<void> {
    await apiClient.patch(`/scheduler-configs/${id}/set-default`)
}

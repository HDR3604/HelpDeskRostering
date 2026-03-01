import { apiClient } from '@/lib/api-client'
import type { Assignment, ScheduleResponse } from '@/types/schedule'

/** Ensure assignments is always an array (backend may return null or {} for empty schedules). */
function normalize(s: ScheduleResponse): ScheduleResponse {
    return {
        ...s,
        assignments: Array.isArray(s.assignments) ? s.assignments : [],
    }
}

export async function listSchedules(): Promise<ScheduleResponse[]> {
    const { data } = await apiClient.get<ScheduleResponse[]>('/schedules')
    return (data ?? []).map(normalize)
}

export async function listArchivedSchedules(): Promise<ScheduleResponse[]> {
    const { data } = await apiClient.get<ScheduleResponse[]>(
        '/schedules/archived',
    )
    return (data ?? []).map(normalize)
}

export async function getSchedule(id: string): Promise<ScheduleResponse> {
    const { data } = await apiClient.get<ScheduleResponse>(`/schedules/${id}`)
    return normalize(data)
}

export async function createSchedule(req: {
    title: string
    effective_from: string
    effective_to?: string | null
}): Promise<ScheduleResponse> {
    const { data } = await apiClient.post<ScheduleResponse>('/schedules', req)
    return normalize(data)
}

export async function archiveSchedule(id: string): Promise<void> {
    await apiClient.patch(`/schedules/${id}/archive`)
}

export async function unarchiveSchedule(id: string): Promise<void> {
    await apiClient.patch(`/schedules/${id}/unarchive`)
}

export async function activateSchedule(id: string): Promise<void> {
    await apiClient.patch(`/schedules/${id}/activate`)
}

export async function deactivateSchedule(id: string): Promise<void> {
    await apiClient.patch(`/schedules/${id}/deactivate`)
}

export async function updateSchedule(
    id: string,
    req: {
        title?: string
        assignments?: Assignment[]
    },
): Promise<ScheduleResponse> {
    const { data } = await apiClient.put<ScheduleResponse>(
        `/schedules/${id}`,
        req,
    )
    return normalize(data)
}

import { apiClient } from '@/lib/api-client'
import type {
    TimeLog,
    ClockInStatus,
    ClockInCode,
    AdminTimeLog,
    AdminTimeLogList,
} from '@/types/time-log'

export type { AdminTimeLog as AdminTimeLogResponse }

// ── Student endpoints ───────────────────────────────────────────────

export async function clockIn(req: {
    code: string
    longitude: number
    latitude: number
}): Promise<TimeLog> {
    const { data } = await apiClient.post<TimeLog>('/time-logs/clock-in', req)
    return data
}

export async function clockOut(): Promise<TimeLog> {
    const { data } = await apiClient.post<TimeLog>('/time-logs/clock-out')
    return data
}

export async function getMyClockInStatus(): Promise<ClockInStatus> {
    const { data } = await apiClient.get<ClockInStatus>('/time-logs/me/status')
    return data
}

// ── Admin endpoints ─────────────────────────────────────────────────

export async function generateClockInCode(
    expiresInMinutes?: number,
): Promise<ClockInCode> {
    const { data } = await apiClient.post<ClockInCode>('/clock-in-codes', {
        expires_in_minutes: expiresInMinutes ?? 60,
    })
    return data
}

export async function getActiveClockInCode(): Promise<ClockInCode> {
    const { data } = await apiClient.get<ClockInCode>('/clock-in-codes/active')
    return data
}

export interface TimeLogFilters {
    page?: number
    per_page?: number
    student_id?: number
    from?: string
    to?: string
    flagged?: boolean
    search?: string
}

export async function listTimeLogs(
    filters: TimeLogFilters = {},
): Promise<AdminTimeLogList> {
    const params = new URLSearchParams()
    if (filters.page) params.set('page', String(filters.page))
    if (filters.per_page) params.set('per_page', String(filters.per_page))
    if (filters.student_id) params.set('student_id', String(filters.student_id))
    if (filters.from) params.set('from', filters.from)
    if (filters.to) params.set('to', filters.to)
    if (filters.flagged !== undefined)
        params.set('flagged', String(filters.flagged))
    if (filters.search) params.set('search', filters.search)

    const qs = params.toString()
    const { data } = await apiClient.get<AdminTimeLogList>(
        `/time-logs${qs ? '?' + qs : ''}`,
    )
    return data
}

export async function getTimeLog(id: string): Promise<AdminTimeLog> {
    const { data } = await apiClient.get<AdminTimeLog>(`/time-logs/${id}`)
    return data
}

export async function flagTimeLog(
    id: string,
    reason: string,
): Promise<TimeLog> {
    const { data } = await apiClient.patch<TimeLog>(`/time-logs/${id}/flag`, {
        reason,
    })
    return data
}

export async function unflagTimeLog(id: string): Promise<TimeLog> {
    const { data } = await apiClient.patch<TimeLog>(`/time-logs/${id}/unflag`)
    return data
}

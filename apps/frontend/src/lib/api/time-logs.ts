import { apiClient } from '@/lib/api-client'
import type {
    TimeLog,
    ClockInStatus,
    ClockInCode,
    AdminTimeLogList,
} from '@/types/time-log'

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

export async function listTimeLogs(params?: {
    from?: string
    to?: string
    flagged?: boolean
    per_page?: number
}): Promise<AdminTimeLogList> {
    const search = new URLSearchParams()
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    if (params?.flagged !== undefined)
        search.set('flagged', String(params.flagged))
    if (params?.per_page) search.set('per_page', String(params.per_page))
    const qs = search.toString()
    const { data } = await apiClient.get<AdminTimeLogList>(
        `/time-logs${qs ? `?${qs}` : ''}`,
    )
    return data
}

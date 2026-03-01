import { apiClient } from '@/lib/api-client'
import type { ShiftTemplate } from '@/types/shift-template'

export async function listShiftTemplates(): Promise<ShiftTemplate[]> {
    const { data } = await apiClient.get<ShiftTemplate[]>('/shift-templates')
    return data ?? []
}

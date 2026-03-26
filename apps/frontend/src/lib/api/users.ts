import { apiClient } from '@/lib/api-client'

export interface UpdateMeRequest {
    first_name?: string
    last_name?: string
    email?: string
}

export interface UserResponse {
    user_id: string
    first_name: string
    last_name: string
    email: string
    role: string
    is_active: boolean
    created_at: string
    updated_at?: string
    email_verified_at?: string
}

export async function updateMe(data: UpdateMeRequest): Promise<UserResponse> {
    const { data: resp } = await apiClient.put<UserResponse>('/users/me', data)
    return resp
}

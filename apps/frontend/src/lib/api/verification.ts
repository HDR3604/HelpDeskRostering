import { apiClient } from '@/lib/api-client'

export async function sendVerificationCode(email: string): Promise<void> {
    await apiClient.post('/verification/send-code', { email })
}

export async function verifyVerificationCode(
    email: string,
    code: string,
): Promise<void> {
    await apiClient.post('/verification/verify-code', { email, code })
}

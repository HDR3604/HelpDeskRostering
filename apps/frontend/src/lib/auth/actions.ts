import type { JwtPayload, AuthTokenResponse } from './types'
import { setTokens, getRefreshToken, clearTokens } from './storage'
import { decodeToken } from './token'
import { authHttpClient } from './refresh'

export async function loginUser(
    email: string,
    password: string,
    rememberMe: boolean = false,
): Promise<JwtPayload> {
    const { data } = await authHttpClient.post<AuthTokenResponse>(
        '/auth/login',
        { email, password },
    )
    setTokens(data.access_token, data.refresh_token, rememberMe)
    const payload = decodeToken(data.access_token)
    if (!payload) throw new Error('Invalid token received from server')
    return payload
}

export async function completeOnboarding(
    token: string,
    password: string,
): Promise<JwtPayload> {
    const { data } = await authHttpClient.post<AuthTokenResponse>(
        '/auth/complete-onboarding',
        { token, password },
    )
    setTokens(data.access_token, data.refresh_token, true)
    const payload = decodeToken(data.access_token)
    if (!payload) throw new Error('Invalid token received from server')
    return payload
}

export async function logoutUser(): Promise<void> {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
        try {
            await authHttpClient.post('/auth/logout', {
                refresh_token: refreshToken,
            })
        } catch {
            // Ignore — clear tokens regardless
        }
    }
    clearTokens()
}

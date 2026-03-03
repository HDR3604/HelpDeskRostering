import axios from 'axios'
import type { AuthTokenResponse } from './types'
import { AUTH_ENDPOINT_PREFIX } from './constants'
import {
    getAccessToken,
    getRefreshToken,
    setTokens,
    clearTokens,
    isRememberMe,
} from './storage'
import { isTokenExpired } from './token'

// ── Auth HTTP Client ──────────────────────────────────────────────────
// A minimal axios instance used only for auth endpoints.
// This avoids importing apiClient and creating a circular dependency.

export const authHttpClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
})

// ── Singleton Refresh Promise ─────────────────────────────────────────
// Ensures concurrent refresh attempts coalesce into a single request.

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')

    const { data } = await authHttpClient.post<AuthTokenResponse>(
        '/auth/refresh',
        { refresh_token: refreshToken },
    )

    setTokens(data.access_token, data.refresh_token, isRememberMe())
    return data.access_token
}

// ── Exported Functions ────────────────────────────────────────────────

/** Clear tokens and hard-redirect to sign-in. */
export function forceLogout(): void {
    clearTokens()
    if (typeof window !== 'undefined') {
        window.location.href = '/sign-in'
    }
}

/**
 * Ensure we have a valid (non-expired) access token.
 * Attempts a silent refresh if the token is expired.
 * Throws if no valid session exists.
 *
 * Used by route guards to refresh before redirecting to sign-in.
 */
export async function ensureValidToken(): Promise<void> {
    const token = getAccessToken()
    if (token && !isTokenExpired(token)) return

    if (!getRefreshToken()) throw new Error('No valid session')

    if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
        })
    }
    await refreshPromise
}

/**
 * Proactively refresh if the access token is near expiry.
 * Returns the (possibly refreshed) token, or null if no token exists.
 * Calls forceLogout() on unrecoverable failure.
 *
 * Used by the api-client request wrapper before each request.
 */
export async function proactiveRefresh(
    currentToken: string | null,
    url: string,
): Promise<string | null> {
    if (
        currentToken &&
        !url.startsWith(AUTH_ENDPOINT_PREFIX) &&
        isTokenExpired(currentToken)
    ) {
        try {
            if (!refreshPromise) {
                refreshPromise = refreshAccessToken().finally(() => {
                    refreshPromise = null
                })
            }
            return await refreshPromise
        } catch {
            forceLogout()
            throw new Error('Session expired')
        }
    }
    return currentToken
}

/**
 * Reactively refresh after a 401 response.
 * Returns a fresh access token, or calls forceLogout() on failure.
 *
 * Used by the api-client request wrapper on 401 errors.
 */
export async function reactiveRefresh(): Promise<string> {
    try {
        if (!refreshPromise) {
            refreshPromise = refreshAccessToken().finally(() => {
                refreshPromise = null
            })
        }
        return await refreshPromise
    } catch {
        forceLogout()
        throw new Error('Session expired')
    }
}

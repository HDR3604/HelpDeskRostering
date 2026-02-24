import { apiClient } from './api-client'

// ── Types ──────────────────────────────────────────────────────────────

/** Shape of the JWT claims issued by the backend. */
export interface JwtPayload {
    sub: string
    first_name: string
    last_name: string
    email: string
    role: 'admin' | 'student'
    exp: number
    iat: number
}

/** Token pair returned by /auth/login and /auth/refresh. */
export interface AuthTokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
}

/** Error envelope returned by the backend for 4xx/5xx. */
export interface ApiErrorBody {
    error: string
}

// ── Storage ────────────────────────────────────────────────────────────

const ACCESS_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const STORAGE_PREF_KEY = 'auth_storage' // "local" | "session"

function getActiveStorage(): Storage {
    return localStorage.getItem(STORAGE_PREF_KEY) === 'local'
        ? localStorage
        : sessionStorage
}

export function setTokens(
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
) {
    // Clear both storages first to prevent stale tokens
    clearTokens()
    const pref = rememberMe ? 'local' : 'session'
    localStorage.setItem(STORAGE_PREF_KEY, pref)
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(ACCESS_TOKEN_KEY, accessToken)
    storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export function getAccessToken(): string | null {
    return getActiveStorage().getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
    return getActiveStorage().getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(STORAGE_PREF_KEY)
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

// ── Token Decoding & Expiry ────────────────────────────────────────────

/** Decode a JWT payload. Returns null if the token is malformed. */
export function decodeToken(token: string): JwtPayload | null {
    try {
        const segment = token.split('.')[1]
        if (!segment) return null
        return JSON.parse(atob(segment)) as JwtPayload
    } catch {
        return null
    }
}

/** True if the token will expire within `bufferSeconds` (default 60s). */
export function isTokenExpired(token: string, bufferSeconds = 60): boolean {
    const payload = decodeToken(token)
    if (!payload?.exp) return true
    return Date.now() >= (payload.exp - bufferSeconds) * 1000
}

/** True if we have a non-expired access token. */
export function isAuthenticated(): boolean {
    const token = getAccessToken()
    return token !== null && !isTokenExpired(token)
}

/** Decode the current access token's payload, or null if absent/malformed. */
export function getTokenPayload(): JwtPayload | null {
    const token = getAccessToken()
    if (!token) return null
    return decodeToken(token)
}

// ── Auth Actions ───────────────────────────────────────────────────────

export async function loginUser(
    email: string,
    password: string,
    rememberMe: boolean = false,
): Promise<JwtPayload> {
    const { data } = await apiClient.post<AuthTokenResponse>('/auth/login', {
        email,
        password,
    })
    setTokens(data.access_token, data.refresh_token, rememberMe)
    const payload = decodeToken(data.access_token)
    if (!payload) throw new Error('Invalid token received from server')
    return payload
}

export async function logoutUser() {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
        try {
            await apiClient.post('/auth/logout', {
                refresh_token: refreshToken,
            })
        } catch {
            // Ignore — clear tokens regardless
        }
    }
    clearTokens()
}

import { apiClient } from './api-client'

const ACCESS_TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'

export function setToken(token: string, rememberMe: boolean = false) {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(ACCESS_TOKEN_KEY, token)
}

export function getToken(): string | null {
    return (
        localStorage.getItem(ACCESS_TOKEN_KEY) ||
        sessionStorage.getItem(ACCESS_TOKEN_KEY)
    )
}

export function setRefreshToken(token: string, rememberMe: boolean = false) {
    const storage = rememberMe ? localStorage : sessionStorage
    storage.setItem(REFRESH_TOKEN_KEY, token)
}

export function getRefreshToken(): string | null {
    return (
        localStorage.getItem(REFRESH_TOKEN_KEY) ||
        sessionStorage.getItem(REFRESH_TOKEN_KEY)
    )
}

export function clearToken() {
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    sessionStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    sessionStorage.removeItem(REFRESH_TOKEN_KEY)
}

export function isLoggedIn(): boolean {
    return getToken() !== null
}

export function decodeTokenPayload(token: string): {
    sub: string
    first_name: string
    last_name: string
    email: string
    role: string
} | null {
    try {
        const payload = token.split('.')[1]
        return JSON.parse(atob(payload))
    } catch {
        return null
    }
}

export function getRole(): string | null {
    const token = getToken()
    if (!token) return null
    return decodeTokenPayload(token)?.role ?? null
}

export function getEmail(): string | null {
    const token = getToken()
    if (!token) return null
    return decodeTokenPayload(token)?.email ?? null
}

export function getName(): { firstName: string; lastName: string } | null {
    const token = getToken()
    if (!token) return null
    const payload = decodeTokenPayload(token)
    if (!payload) return null
    return { firstName: payload.first_name, lastName: payload.last_name }
}

interface AuthTokenResponse {
    access_token: string
    refresh_token: string
    token_type: string
    expires_in: number
}

export async function loginUser(
    email: string,
    password: string,
    rememberMe: boolean = false,
) {
    const { data } = await apiClient.post<AuthTokenResponse>('/auth/login', {
        email,
        password,
    })
    setToken(data.access_token, rememberMe)
    setRefreshToken(data.refresh_token, rememberMe)
    const role = decodeTokenPayload(data.access_token)?.role ?? 'student'
    return { token: data.access_token, role }
}

export async function logoutUser() {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
        try {
            await apiClient.post('/auth/logout', {
                refresh_token: refreshToken,
            })
        } catch {
            // Ignore logout errors — clear tokens regardless
        }
    }
    clearToken()
}

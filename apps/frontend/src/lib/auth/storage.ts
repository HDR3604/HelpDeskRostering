import {
    ACCESS_TOKEN_KEY,
    AUTH_CHANGE_EVENT,
    REFRESH_TOKEN_KEY,
    STORAGE_PREF_KEY,
} from './constants'

/** Key for the timestamp when tokens were last written/refreshed. */
const STORED_AT_KEY = 'auth_stored_at'

/** How long tokens persist without "remember me" (36 hours in ms). */
const SESSION_TTL_MS = 36 * 60 * 60 * 1000

// ── Safe storage helpers ────────────────────────────────────────────
// Safari private browsing can throw on localStorage.setItem in some versions.

function safeSet(key: string, value: string): void {
    try {
        localStorage.setItem(key, value)
    } catch {
        // Storage full or blocked (e.g. Safari private mode) — silently ignore
    }
}

function safeRemove(key: string): void {
    try {
        localStorage.removeItem(key)
    } catch {
        // Ignore
    }
}

function safeSessionRemove(key: string): void {
    try {
        sessionStorage.removeItem(key)
    } catch {
        // Ignore
    }
}

// ── Migration (runs once on module load) ────────────────────────────

try {
    // 1. Move tokens from sessionStorage → localStorage (old code used sessionStorage)
    const sessionToken = sessionStorage.getItem(ACCESS_TOKEN_KEY)
    if (sessionToken && !localStorage.getItem(ACCESS_TOKEN_KEY)) {
        safeSet(ACCESS_TOKEN_KEY, sessionToken)
        const rt = sessionStorage.getItem(REFRESH_TOKEN_KEY)
        if (rt) safeSet(REFRESH_TOKEN_KEY, rt)
        safeSet(STORAGE_PREF_KEY, 'timed')
        safeSet(STORED_AT_KEY, String(Date.now()))
    }
    safeSessionRemove(ACCESS_TOKEN_KEY)
    safeSessionRemove(REFRESH_TOKEN_KEY)

    // 2. Migrate old pref values: "local" → "permanent", "session" → "timed"
    const pref = localStorage.getItem(STORAGE_PREF_KEY)
    if (pref === 'local') {
        safeSet(STORAGE_PREF_KEY, 'permanent')
    } else if (pref === 'session') {
        safeSet(STORAGE_PREF_KEY, 'timed')
        if (!localStorage.getItem(STORED_AT_KEY)) {
            safeSet(STORED_AT_KEY, String(Date.now()))
        }
    }

    // 3. Backfill STORED_AT_KEY for tokens that exist without it
    if (
        localStorage.getItem(ACCESS_TOKEN_KEY) &&
        !localStorage.getItem(STORED_AT_KEY)
    ) {
        safeSet(STORED_AT_KEY, String(Date.now()))
    }

    // 4. Ensure pref is set if tokens exist without one
    if (
        localStorage.getItem(ACCESS_TOKEN_KEY) &&
        !localStorage.getItem(STORAGE_PREF_KEY)
    ) {
        safeSet(STORAGE_PREF_KEY, 'timed')
    }
} catch {
    // If anything goes wrong during migration, don't crash the app
}

// ── Core API ────────────────────────────────────────────────────────

function isExpiredSession(): boolean {
    const pref = localStorage.getItem(STORAGE_PREF_KEY)
    if (pref === 'permanent') return false

    // For timed sessions, check the TTL
    const storedAt = localStorage.getItem(STORED_AT_KEY)
    if (!storedAt) {
        // Tokens exist but no timestamp — treat as expired to force fresh login
        return !!localStorage.getItem(ACCESS_TOKEN_KEY)
    }

    return Date.now() - Number(storedAt) > SESSION_TTL_MS
}

export function setTokens(
    accessToken: string,
    refreshToken: string,
    rememberMe: boolean,
) {
    clearTokens()
    safeSet(STORAGE_PREF_KEY, rememberMe ? 'permanent' : 'timed')
    safeSet(STORED_AT_KEY, String(Date.now()))
    safeSet(ACCESS_TOKEN_KEY, accessToken)
    safeSet(REFRESH_TOKEN_KEY, refreshToken)
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
}

/**
 * Refresh the TTL timestamp. Called on token refresh so the 36h clock
 * resets on active usage — the session only expires after 36h of inactivity.
 */
export function touchSession(): void {
    if (localStorage.getItem(STORAGE_PREF_KEY) === 'timed') {
        safeSet(STORED_AT_KEY, String(Date.now()))
    }
}

export function getAccessToken(): string | null {
    if (isExpiredSession()) {
        clearTokens()
        return null
    }
    return localStorage.getItem(ACCESS_TOKEN_KEY)
}

export function getRefreshToken(): string | null {
    if (isExpiredSession()) {
        clearTokens()
        return null
    }
    return localStorage.getItem(REFRESH_TOKEN_KEY)
}

export function clearTokens() {
    safeRemove(ACCESS_TOKEN_KEY)
    safeRemove(REFRESH_TOKEN_KEY)
    safeRemove(STORAGE_PREF_KEY)
    safeRemove(STORED_AT_KEY)
    safeSessionRemove(ACCESS_TOKEN_KEY)
    safeSessionRemove(REFRESH_TOKEN_KEY)
}

/** Returns true if the user chose "remember me" (permanent mode). */
export function isRememberMe(): boolean {
    return localStorage.getItem(STORAGE_PREF_KEY) === 'permanent'
}

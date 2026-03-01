import type { JwtPayload } from './types'
import { TOKEN_EXPIRY_BUFFER_SECONDS } from './constants'
import { getAccessToken } from './storage'

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

/** True if the token will expire within `bufferSeconds`. */
export function isTokenExpired(
    token: string,
    bufferSeconds = TOKEN_EXPIRY_BUFFER_SECONDS,
): boolean {
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

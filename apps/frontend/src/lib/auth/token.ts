import type { JwtPayload } from './types'
import { TOKEN_EXPIRY_BUFFER_SECONDS } from './constants'
import { getAccessToken } from './storage'

/** Decode a base64url string (RFC 7515) to a UTF-8 string. */
function base64UrlDecode(input: string): string {
    // Replace base64url chars with base64 equivalents and add padding
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(
        base64.length + ((4 - (base64.length % 4)) % 4),
        '=',
    )
    return atob(padded)
}

/** Decode a JWT payload. Returns null if the token is malformed. */
export function decodeToken(token: string): JwtPayload | null {
    try {
        const segment = token.split('.')[1]
        if (!segment) return null
        return JSON.parse(base64UrlDecode(segment)) as JwtPayload
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

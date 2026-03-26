// ── Types ──
export type { JwtPayload, AuthTokenResponse, ApiErrorBody } from './types'

// ── Constants ──
export { TOKEN_EXPIRY_BUFFER_SECONDS } from './constants'

// ── Storage ──
export {
    setTokens,
    getAccessToken,
    getRefreshToken,
    clearTokens,
} from './storage'

// ── Token ──
export {
    decodeToken,
    isTokenExpired,
    isAuthenticated,
    getTokenPayload,
} from './token'

// ── Refresh & Session ──
export {
    ensureValidToken,
    forceLogout,
    forceRefreshToken,
    proactiveRefresh,
    reactiveRefresh,
} from './refresh'

// ── Actions ──
export { loginUser, logoutUser, forgotPassword } from './actions'

// ── Route Guard ──
export { requireAuth } from './guard'

// ── React Hooks ──
export { UserProvider, useUser } from './hooks/use-user'
export { useLogout } from './hooks/use-logout'

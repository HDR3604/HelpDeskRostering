/** localStorage key for the access token. */
export const ACCESS_TOKEN_KEY = "auth_token"

/** localStorage/sessionStorage key for the refresh token. */
export const REFRESH_TOKEN_KEY = "refresh_token"

/** localStorage key tracking which storage backend is active ("local" | "session"). */
export const STORAGE_PREF_KEY = "auth_storage"

/** Seconds before actual expiry at which a token is considered "expired" for proactive refresh. */
export const TOKEN_EXPIRY_BUFFER_SECONDS = 60

/** URL prefix for auth endpoints (used to skip token refresh on auth requests). */
export const AUTH_ENDPOINT_PREFIX = "/auth/"

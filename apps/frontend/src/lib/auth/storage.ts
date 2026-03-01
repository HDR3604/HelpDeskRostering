import {
  ACCESS_TOKEN_KEY,
  AUTH_CHANGE_EVENT,
  REFRESH_TOKEN_KEY,
  STORAGE_PREF_KEY,
} from "./constants"

function getActiveStorage(): Storage {
  return localStorage.getItem(STORAGE_PREF_KEY) === "local"
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
  const pref = rememberMe ? "local" : "session"
  localStorage.setItem(STORAGE_PREF_KEY, pref)
  const storage = rememberMe ? localStorage : sessionStorage
  storage.setItem(ACCESS_TOKEN_KEY, accessToken)
  storage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT))
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

/** Returns true if the user chose "remember me" (localStorage mode). */
export function isRememberMe(): boolean {
  return localStorage.getItem(STORAGE_PREF_KEY) === "local"
}

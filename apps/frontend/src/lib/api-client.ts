import axios from "redaxios"
import type { Response } from "redaxios"
import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
  type AuthTokenResponse,
} from "./auth"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
})

// ── Token Refresh ──────────────────────────────────────────────────────
// A single in-flight refresh promise ensures concurrent 401s don't each
// trigger their own refresh call — they all wait on the same promise.

let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) throw new Error("No refresh token")

  // Use the raw client (not apiClient) to avoid infinite request() loops
  const { data } = await client.post<AuthTokenResponse>("/auth/refresh", {
    refresh_token: refreshToken,
  })

  const rememberMe = localStorage.getItem("auth_storage") === "local"
  setTokens(data.access_token, data.refresh_token, rememberMe)
  return data.access_token
}

function forceLogout() {
  clearTokens()
  if (typeof window !== "undefined") {
    window.location.href = "/sign-in"
  }
}

// ── Request Wrapper ────────────────────────────────────────────────────

function headers(token: string | null): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(
  fn: (token: string | null) => Promise<Response<T>>,
  url: string,
): Promise<Response<T>> {
  const isAuthEndpoint = url.startsWith("/auth/")

  // Proactive refresh: if the access token is about to expire, refresh
  // before making the request so the server never sees an expired token.
  let token = getAccessToken()
  if (token && !isAuthEndpoint && isTokenExpired(token)) {
    try {
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null
        })
      }
      token = await refreshPromise
    } catch {
      forceLogout()
      throw new Error("Session expired")
    }
  }

  try {
    return await fn(token)
  } catch (error) {
    const err = error as { status?: number }

    // Reactive refresh: if the server returned 401, try to refresh once
    // and retry the original request with a fresh token.
    if (err.status === 401 && !isAuthEndpoint) {
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const freshToken = await refreshPromise
        return await fn(freshToken)
      } catch {
        forceLogout()
        throw new Error("Session expired")
      }
    }

    throw error
  }
}

// ── Public API ─────────────────────────────────────────────────────────

export const apiClient = {
  get: <T>(url: string) =>
    request<T>((t) => client.get(url, { headers: headers(t) }), url),

  post: <T>(url: string, data?: unknown) =>
    request<T>((t) => client.post(url, data, { headers: headers(t) }), url),

  put: <T>(url: string, data?: unknown) =>
    request<T>((t) => client.put(url, data, { headers: headers(t) }), url),

  patch: <T>(url: string, data?: unknown) =>
    request<T>((t) => client.patch(url, data, { headers: headers(t) }), url),

  delete: <T>(url: string) =>
    request<T>((t) => client.delete(url, { headers: headers(t) }), url),
}

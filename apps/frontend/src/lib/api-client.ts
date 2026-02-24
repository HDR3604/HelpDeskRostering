import axios from "redaxios"
import type { Response } from "redaxios"
import { getToken, clearToken } from "./auth"

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
})

async function request<T>(fn: () => Promise<Response<T>>, url: string): Promise<Response<T>> {
  try {
    return await fn()
  } catch (error) {
    const err = error as { status?: number }
    if (err.status === 401 && !url.startsWith("/auth/") && typeof window !== "undefined") {
      clearToken()
      window.location.href = "/sign-in"
    }
    throw error
  }
}

function headers(): Record<string, string> {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const apiClient = {
  get: <T>(url: string) =>
    request<T>(() => client.get(url, { headers: headers() }), url),

  post: <T>(url: string, data?: unknown) =>
    request<T>(() => client.post(url, data, { headers: headers() }), url),

  put: <T>(url: string, data?: unknown) =>
    request<T>(() => client.put(url, data, { headers: headers() }), url),

  patch: <T>(url: string, data?: unknown) =>
    request<T>(() => client.patch(url, data, { headers: headers() }), url),

  delete: <T>(url: string) =>
    request<T>(() => client.delete(url, { headers: headers() }), url),
}

import axios, { type AxiosResponse, isAxiosError } from 'axios'
import { getAccessToken, proactiveRefresh, reactiveRefresh } from '@/lib/auth'
import { AUTH_ENDPOINT_PREFIX } from '@/lib/auth/constants'

const client = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
})

// ── Request Wrapper ────────────────────────────────────────────────────

function headers(token: string | null): Record<string, string> {
    return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request<T>(
    fn: (token: string | null) => Promise<AxiosResponse<T>>,
    url: string,
): Promise<AxiosResponse<T>> {
    const isAuthEndpoint = url.startsWith(AUTH_ENDPOINT_PREFIX)

    // Proactive refresh (delegated to auth SDK)
    const token = await proactiveRefresh(getAccessToken(), url)

    try {
        return await fn(token)
    } catch (error) {
        // Reactive refresh on 401 (delegated to auth SDK)
        if (
            isAxiosError(error) &&
            error.response?.status === 401 &&
            !isAuthEndpoint
        ) {
            const freshToken = await reactiveRefresh()
            return await fn(freshToken)
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
        request<T>(
            (t) => client.patch(url, data, { headers: headers(t) }),
            url,
        ),

    delete: <T>(url: string) =>
        request<T>((t) => client.delete(url, { headers: headers(t) }), url),
}

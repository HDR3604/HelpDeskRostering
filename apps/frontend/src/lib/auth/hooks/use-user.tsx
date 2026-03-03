import * as React from 'react'
import { getTokenPayload } from '../token'
import {
    ACCESS_TOKEN_KEY,
    AUTH_CHANGE_EVENT,
    STORAGE_PREF_KEY,
} from '../constants'
import type { JwtPayload } from '../types'

type UserContextValue = {
    role: JwtPayload['role']
    firstName: string | null
    lastName: string | null
    email: string | null
}

const UserContext = React.createContext<UserContextValue | null>(null)

function buildUserValue(payload: JwtPayload | null): UserContextValue {
    return {
        role: payload?.role ?? 'admin',
        firstName: payload?.first_name ?? null,
        lastName: payload?.last_name ?? null,
        email: payload?.email ?? null,
    }
}

export function UserProvider({ children }: { children: React.ReactNode }) {
    const [value, setValue] = React.useState<UserContextValue>(() =>
        buildUserValue(getTokenPayload()),
    )

    // Re-derive user state when tokens change.
    // "storage" fires cross-tab; AUTH_CHANGE_EVENT fires same-tab.
    React.useEffect(() => {
        function refresh() {
            const payload = getTokenPayload()
            if (!payload) {
                window.location.href = '/sign-in'
                return
            }
            setValue(buildUserValue(payload))
        }

        function onStorage(e: StorageEvent) {
            if (
                e.key === ACCESS_TOKEN_KEY ||
                e.key === STORAGE_PREF_KEY ||
                e.key === null
            ) {
                refresh()
            }
        }

        window.addEventListener('storage', onStorage)
        window.addEventListener(AUTH_CHANGE_EVENT, refresh)
        return () => {
            window.removeEventListener('storage', onStorage)
            window.removeEventListener(AUTH_CHANGE_EVENT, refresh)
        }
    }, [])

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUser() {
    const ctx = React.useContext(UserContext)
    if (!ctx) throw new Error('useUser must be used within UserProvider')
    return ctx
}

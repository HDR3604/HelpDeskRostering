import { redirect } from '@tanstack/react-router'
import { isAuthenticated } from './auth'
import { ensureValidToken } from './api-client'

export async function requireAuth({
    location,
}: {
    location: { pathname: string }
}) {
    if (isAuthenticated()) return

    // Token expired — try a silent refresh before kicking to sign-in
    try {
        await ensureValidToken()
    } catch {
        throw redirect({
            to: '/sign-in',
            search: { redirect: location.pathname },
        })
    }
}
